import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import {
  PutObjectCommand,
  S3Client,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectSDGService } from '../projectsdg/projectsdg.service';

import { Prisma } from '@prisma/client';

/** case-insensitive LIKE pattern list: ["%term1%", "%term2%"] */
const likePatterns = (values: string[]) =>
  values.map(v => `%${v.toLowerCase()}%`);

function intersect<T>(a: T[] | null, b: T[]): T[] {
  if (!a) return b;
  const set = new Set(a);
  return b.filter(x => set.has(x));
}

@Injectable()
export class ProjectService {
  private s3: S3Client;
  private bucketName: string;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ProjectSDGService))
    private readonly projectSDGService: ProjectSDGService,
  ) {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.bucketName = process.env.AWS_S3_BUCKET_NAME!;
  }

  async getAllProjects() {
    return this.prisma.project.findMany({
      include: {
        sdgs: { include: { sdg: true } },
        CampaignProject: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async getOne(id: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        sdgs: { include: { sdg: true } },
        CampaignProject: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async filterProjects(filters: any) {
    // Helpers
    const intersect = <T,>(a: T[] | null, b: T[]) => {
      if (!a) return b;
      const set = new Set(a);
      return b.filter(x => set.has(x));
    };

    const where: any = {};
    let idGate: number[] | null = null; // if set, restrict results to these ids

    // --- SDG filter (RELATION ONLY, case-insensitive on sdg.name) ---
    if (filters?.sdgs?.length) {
      const sdgTerms = (filters.sdgs as string[]).filter(Boolean);

      // Build OR over case-insensitive equals on the related SDG name
      const sdgOr = sdgTerms.map(term => ({
        sdgs: {
          some: {
            sdg: { name: { equals: term, mode: 'insensitive' as const } },
          },
        },
      }));

      // Get matching IDs once (useful if later filters apply raw SQL)
      const relMatches = await this.prisma.project.findMany({
        where: { OR: sdgOr },
        select: { id: true },
      });

      idGate = relMatches.map(r => r.id);
      if (idGate.length === 0) return [];
    }

    // --- Project types (stored as CSV string) ---
    if (filters?.project_type?.length) {
      where.OR = (where.OR || []).concat(
        (filters.project_type as string[]).map(pt => ({
          projectTypes: { contains: pt, mode: 'insensitive' as const },
        }))
      );
    }

    // --- Verification (String + JSON) ---
    if (filters?.verification?.length) {
      const vTerms = (filters.verification as string[]).filter(Boolean);

      // A) String column: verificationMethod (case-insensitive contains)
      if (vTerms.length) {
        const vOr = vTerms.map(term => ({
          verificationMethod: { contains: term, mode: 'insensitive' as const },
        }));
        where.AND = (where.AND || []).concat({ OR: vOr });
      }

      // B) JSON column: standards -> text search via raw SQL (safer ANY)
      if (vTerms.length) {
        const likePatterns = vTerms.map(t => `%${String(t).toLowerCase()}%`);

        const verifRows = await this.prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
          SELECT "id"
          FROM "Project"
          WHERE LOWER(CAST("standards" AS text)) ILIKE ANY (
            ARRAY[${Prisma.join(likePatterns)}]::text[]
          )
        `);

        const verifIds = verifRows.map(r => r.id);
        idGate = idGate ? intersect(idGate, verifIds) : verifIds;
        if (idGate.length === 0) return [];
      }
    }

    // --- Sectors: case-insensitive equals (mode not allowed with `in`) ---
    if (filters?.primary_sector?.length) {
      where.OR = (where.OR || []).concat(
        (filters.primary_sector as string[]).map(v => ({
          primarySector: { equals: v, mode: 'insensitive' as const },
        }))
      );
    }
    if (filters?.secondary_sector?.length) {
      where.OR = (where.OR || []).concat(
        (filters.secondary_sector as string[]).map(v => ({
          secondarySector: { equals: v, mode: 'insensitive' as const },
        }))
      );
    }

    // --- Methodology filter ---
    if (filters?.methodology?.length) {
      where.OR = (where.OR || []).concat(
        (filters.methodology as string[]).map(m => ({
          projectMethodology: { contains: m, mode: 'insensitive' as const },
        }))
      );
    }

    // --- Apply idGate from relation/JSON matches, if any ---
    if (idGate) {
      if (idGate.length === 0) return [];
      where.id = { in: idGate };
    }

    // Return results
    return this.prisma.project.findMany({
      where,
      orderBy: { id: 'asc' },
      include: {
        sdgs: { include: { sdg: true } },
        CampaignProject: true,
      },
    });
  }


  async clearProjectCache(): Promise<{ deleted: number; reset: number }> {
    // 1. Remove all SDG associations first (FK constraint)
    await this.prisma.projectSDG.deleteMany({});

    // 2. Find projects referenced by campaigns or votes — cannot delete these
    const withAssociations = await this.prisma.project.findMany({
      where: {
        OR: [
          { CampaignProject: { some: {} } },
          { votes: { some: {} } },
        ],
      },
      select: { id: true },
    });
    const idsWithAssoc = withAssociations.map(p => p.id);

    // 3. Delete unreferenced projects
    const deleted = await this.prisma.project.deleteMany({
      where: { id: { notIn: idsWithAssoc } },
    });

    // 4. Reset rich data on referenced projects so they get re-synced
    if (idsWithAssoc.length > 0) {
      await this.prisma.project.updateMany({
        where: { id: { in: idsWithAssoc } },
        data: {
          projectName: null,
          primarySector: null,
          secondarySector: null,
          projectTypes: null,
          standards: null,
          impactAndRiskSdgs: null,
          impactAndRiskAssessments: null,
          verificationMethod: null,
          proofPurpose: null,
          projectMethodology: null,
          latitude: null,
          longitude: null,
        },
      });
    }

    return { deleted: deleted.count, reset: idsWithAssoc.length };
  }

  // ✅ Optional: helper to upload file to S3
  async uploadFileToS3(file: Express.Multer.File): Promise<string> {
    const fileKey = `${uuidv4()}${path.extname(file.originalname)}`;

    const uploadParams: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await this.s3.send(new PutObjectCommand(uploadParams));

    return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
  }
}
