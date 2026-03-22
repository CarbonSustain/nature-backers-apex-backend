import { Controller, Post, Get, Body, Param, Res, HttpStatus } from '@nestjs/common';
import { VolunteerService } from './volunteer.service';
import { Response } from 'express';

@Controller('volunteer')
export class VolunteerController {
  constructor(private readonly volunteerService: VolunteerService) {}

  /**
   * POST /volunteer
   * Body: { userId: number, campaignId: number }
   */
  @Post()
  async createVolunteer(
    @Body() body: { userId: number; campaignId: number },
    @Res() res: Response,
  ) {
    if (!body.userId || !body.campaignId) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        message: 'userId and campaignId are required',
      });
    }

    try {
      const volunteer = await this.volunteerService.createVolunteer(
        Number(body.userId),
        Number(body.campaignId),
      );
      return res.status(HttpStatus.CREATED).json({
        statusCode: 201,
        message: 'Volunteer registration saved',
        data: volunteer,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: error.message || 'Failed to save volunteer',
      });
    }
  }

  /**
   * GET /volunteer/campaign/:campaignId
   */
  @Get('campaign/:campaignId')
  async getVolunteersByCampaign(
    @Param('campaignId') campaignId: string,
    @Res() res: Response,
  ) {
    const id = parseInt(campaignId, 10);
    if (isNaN(id)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        message: 'Invalid campaign ID',
      });
    }

    try {
      const volunteers = await this.volunteerService.getVolunteersByCampaign(id);
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Volunteers retrieved successfully',
        data: volunteers,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: error.message || 'Failed to retrieve volunteers',
      });
    }
  }
}
