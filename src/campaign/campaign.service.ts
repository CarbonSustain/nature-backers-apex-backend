import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  PutObjectCommand,
  S3Client,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

@Injectable()
export class CampaignService {
  private s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  private bucketName = process.env.AWS_S3_BUCKET_NAME!;

  async uploadImageToS3(file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname);
    const key = `uploads/campaigns/${uuidv4()}${ext}`;

    const uploadParams: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await this.s3.send(new PutObjectCommand(uploadParams));

    // Return CloudFront URL instead of direct S3 URL
    return `${process.env.BACKEND_CLOUDFRONT_URL}${key}`;
  }

  async createCampaign(data: {
    name: string;
    votingStyle: 'TOKEN_BASED' | 'STORY_FEATURE' | 'THEMED_BADGES';
    startDate: Date;
    endDate: Date;
    emailSubject?: string;
    emailBody?: string;
    url: string;
    departmentIds: number[];
  }) {
    const { departmentIds, ...campaignData } = data;
    
    // Get the "Created" status ID
    const createdStatus = await prisma.campaignStatus.findUnique({
      where: { name: 'Created' }
    });

    if (!createdStatus) {
      throw new Error('Created status not found in database');
    }
    
    return prisma.campaign.create({
      data: {
        ...campaignData,
        campaignStatusId: createdStatus.id, // Always start with "Created" status
        CampaignDepartment: {
          create: departmentIds.map(departmentId => ({
            departmentId: departmentId
          }))
        }
      },
      include: {
        CampaignDepartment: {
          include: {
            department: true
          }
        },
        campaignStatus: true
      }
    });
  }

  async findAll() {
    return prisma.campaign.findMany({
      include: { 
        CampaignProject: true,
        CampaignDepartment: {
          include: {
            department: true
          }
        },
        campaignStatus: true,
        votes: {
          select: {
            id: true,
            vote_hash: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });
  }

  async getCampaignWithProjects(campaignId: number) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        CampaignProject: {
          include: { project: true },
        },
        CampaignDepartment: {
          include: {
            department: true
          }
        }
      },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    return campaign;
  }

  async getCampaignWithStatus(campaignId: number) {
    console.log('🔍 getCampaignWithStatus called with campaignId:', campaignId, 'type:', typeof campaignId);
    
    if (!campaignId || isNaN(campaignId)) {
      throw new Error(`Invalid campaignId: ${campaignId}`);
    }
    
    const campaign = await prisma.campaign.findUnique({
      where: { id: Number(campaignId) },
      include: {
        campaignStatus: true,
        CampaignDepartment: {
          include: {
            department: true
          }
        }
      },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    return campaign;
  }


}
