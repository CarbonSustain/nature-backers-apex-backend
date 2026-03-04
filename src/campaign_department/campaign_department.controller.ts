import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { CampaignDepartmentService } from './campaign_department.service';
import { Response } from 'express';

@Controller('campaign-department')
export class CampaignDepartmentController {
  constructor(private readonly campaignDepartmentService: CampaignDepartmentService) {}

  @Post('assign')
  async assign(@Body() body: { campaignId: number; departmentId: number }, @Res() res: Response) {
    try {
      if (!body.campaignId || !body.departmentId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'campaignId and departmentId are required',
        });
      }
      const result = await this.campaignDepartmentService.assign(body.campaignId, body.departmentId);
      return res.status(HttpStatus.CREATED).json({
        statusCode: 201,
        message: 'Campaign and department linked successfully',
        data: result,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: 409,
          message: 'This campaign-department association already exists.',
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
} 