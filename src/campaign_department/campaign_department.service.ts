import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class CampaignDepartmentService {
  async assign(campaignId: number, departmentId: number) {
    return prisma.campaignDepartment.create({
      data: { campaignId, departmentId },
    });
  }
} 