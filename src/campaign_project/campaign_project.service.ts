import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class CampaignProjectService {
  async assign(campaignId: number, projectIds: number[]) {
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const projectId of projectIds) {
      try {
        const result = await prisma.campaignProject.create({
          data: { campaignId, projectId },
          include: {
            project: {
              select: {
                id: true,
                projectName: true
              }
            }
          }
        });
        
        results.push({
          projectId,
          success: true,
          data: result
        });
        successCount++;
        
      } catch (error) {
        if (error.code === 'P2002') {
          // Duplicate entry - already assigned
          results.push({
            projectId,
            success: false,
            error: 'Project already assigned to this campaign'
          });
        } else {
          results.push({
            projectId,
            success: false,
            error: error.message
          });
        }
        failedCount++;
      }
    }

    return {
      campaignId,
      totalRequested: projectIds.length,
      successCount,
      failedCount,
      results
    };
  }
} 