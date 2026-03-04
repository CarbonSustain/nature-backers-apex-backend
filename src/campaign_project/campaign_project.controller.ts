import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { CampaignProjectService } from './campaign_project.service';
import { Response } from 'express';

@Controller('campaign-project')
export class CampaignProjectController {
  constructor(private readonly campaignProjectService: CampaignProjectService) {}



  @Post('assign')
  async assign(@Body() body: { campaignId: number; projectIds: number[] }, @Res() res: Response) {
    try {
      if (!body.campaignId || !body.projectIds || !Array.isArray(body.projectIds)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'campaignId and projectIds array are required',
        });
      }

      if (body.projectIds.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'projectIds array cannot be empty',
        });
      }

      const result = await this.campaignProjectService.assign(body.campaignId, body.projectIds);
      
      return res.status(HttpStatus.CREATED).json({
        statusCode: 201,
        message: `Successfully assigned ${result.successCount} project${result.successCount !== 1 ? 's' : ''} to campaign`,
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
} 