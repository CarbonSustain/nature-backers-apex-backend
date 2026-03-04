import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ProjectSDGService {
  async createAssociations(projectId: number, sdgIds: number[]) {
    await prisma.projectSDG.deleteMany({ where: { projectId } });
    return prisma.projectSDG.createMany({
      data: sdgIds.map(sdgId => ({ projectId, sdgId })),
      skipDuplicates: true
    });
  }

  async createAssociation(projectId: number, sdgId: number) {
    return prisma.projectSDG.create({
      data: { projectId, sdgId },
    });
  }
} 