import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class VolunteerService {
  async createVolunteer(userId: number, campaignId: number) {
    // Upsert so duplicate calls are idempotent
    return prisma.volunteer.upsert({
      where: { userId_campaignId: { userId, campaignId } },
      update: {},
      create: { userId, campaignId },
    });
  }

  async getVolunteersByCampaign(campaignId: number) {
    return prisma.volunteer.findMany({
      where: { campaignId },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            business_email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
