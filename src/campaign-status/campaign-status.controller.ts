import { Body, Controller, Get, Param, Post, Put, Res, HttpStatus, Query } from '@nestjs/common';
import { CampaignStatusService } from './campaign-status.service';
import { Response } from 'express';

@Controller('campaign-status')
export class CampaignStatusController {
  constructor(private readonly campaignStatusService: CampaignStatusService) {}

  @Post()
  async create(@Body() data: { name: string }, @Res() res: Response) {
    try {
      const status = await this.campaignStatusService.create(data);
      return res.status(HttpStatus.CREATED).json({
        statusCode: 201,
        message: 'Campaign status created successfully',
        data: status,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  @Get()
  async findAll(@Res() res: Response) {
    try {
      const statuses = await this.campaignStatusService.findAll();
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Campaign statuses fetched successfully',
        data: statuses,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  /**
   * Unified campaign status update API
   * Supports: approve, reject, cancel
   */
  @Put('update/:id')
  async updateCampaignStatus(
    @Param('id') id: string, 
    @Body() body: { action: 'approve' | 'reject' | 'cancel' },
    @Res() res: Response
  ) {
    try {
      const { action } = body;
      
      if (!action || !['approve', 'reject', 'cancel'].includes(action)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Invalid action. Must be one of: approve, reject, cancel',
        });
      }

      let result;
      switch (action) {
        case 'approve':
          result = await this.campaignStatusService.approveCampaign(+id);
          break;
        case 'reject':
          result = await this.campaignStatusService.rejectCampaign(+id);
          break;
        case 'cancel':
          result = await this.campaignStatusService.cancelCampaign(+id);
          break;
      }

      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: result.message,
        data: result
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }



  /**
   * GET /campaign-status/scheduled-update - Handle scheduled campaign status updates
   * This endpoint is called by EventBridge Lambda for automated status updates
   */
  @Get('scheduled-update')
  async handleScheduledUpdate(@Res() res: Response) {
    try {
      console.log(`🕐 Processing scheduled campaign status update`);
      
      // Update all campaign statuses (this now includes triggering status-specific actions)
      const result = await this.campaignStatusService.updateAllCampaignStatuses();

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Scheduled campaign status update completed',
        data: {
          totalUpdated: result.totalUpdated,
          activated: result.activateResult,
          pending: result.pendingResult,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ Error processing scheduled status update:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Failed to process scheduled status update',
        error: error.message
      });
    }
  }

  /**
   * GET /campaign-status/handle-status-update - Handle status-based actions
   * This endpoint is called by the status actions Lambda for manual status changes
   */
  @Get('handle-status-update')
  async handleStatusUpdate(@Query('campaignId') campaignId: string, @Res() res: Response) {
    try {
      console.log(`🔄 Processing status update for campaign ${campaignId}`);
      
      if (!campaignId || isNaN(+campaignId)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Invalid campaignId parameter',
          received: campaignId
        });
      }
      
      const result = await this.campaignStatusService.handleStatusUpdate(+campaignId);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
        campaignId: result.campaignId,
        status: result.status
      });
      
    } catch (error) {
      console.error('❌ Error processing status update:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Failed to process status update',
        error: error.message
      });
    }
  }

  /**
   * GET /campaign-status/nightly-correction - Handle nightly campaign state corrections
   * This endpoint is called by EventBridge Lambda for nightly maintenance
   */
  @Get('nightly-correction')
  async handleNightlyCorrection(@Res() res: Response) {
    try {
      console.log(`🌙 Starting nightly campaign state correction...`);
      
      const result = await this.campaignStatusService.performNightlyCorrection();

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Nightly campaign state correction completed',
        data: result
      });
      
    } catch (error) {
      console.error('❌ Error processing nightly correction:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Failed to process nightly correction',
        error: error.message
      });
    }
  }

} 