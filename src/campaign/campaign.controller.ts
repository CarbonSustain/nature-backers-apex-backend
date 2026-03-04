import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
  HttpStatus
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CampaignService } from './campaign.service';
import { Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';


@Controller('campaign')
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file')) // Handle image
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      name: string;
      votingStyle: string;
      startDate: string;
      endDate: string;
      emailSubject?: string;
      emailBody?: string;
      departmentIds: string;
    },
    @Res() res: Response
  ) {
    try {
      // Validation for required fields
      const requiredFields = ['name', 'votingStyle', 'startDate', 'endDate', 'departmentIds'];
      for (const field of requiredFields) {
        if (body[field] === undefined || body[field] === null || body[field] === '') {
          return res.status(HttpStatus.BAD_REQUEST).json({
            statusCode: 400,
            message: `${field} is required`,
          });
        }
      }

      // Validation for votingStyle
      const allowedVotingStyles = ['TOKEN_BASED', 'STORY_FEATURE', 'THEMED_BADGES'];
      if (!allowedVotingStyles.includes(body.votingStyle)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: `Invalid votingStyle. Allowed values: ${allowedVotingStyles.join(', ')}`,
        });
      }
      // Validation for startDate and endDate
      const startDate = new Date(body.startDate);
      const endDate = new Date(body.endDate);
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Use UTC for consistent comparison
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Invalid date format for startDate or endDate',
        });
      }
      if (startDate.getTime() === endDate.getTime()) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'startDate and endDate cannot be equal',
        });
      }
      if (endDate.getTime() <= startDate.getTime()) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'endDate must be after startDate',
        });
      }
      if (startDate.getTime() <= today.getTime()) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'startDate must be after today',
        });
      }
      if (!file) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'File not uploaded',
        });
      }
      
      // Parse departmentIds from string like "[1,2,3,4]" to integer array
      let departmentIds: number[];
      try {
        if (!body.departmentIds) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            statusCode: 400,
            message: 'departmentIds is required',
          });
        }
        
        // Remove brackets and split by comma, then parse each ID
        const departmentIdsString = body.departmentIds.replace(/[\[\]]/g, '');
        departmentIds = departmentIdsString.split(',').map(id => parseInt(id.trim()));
        
        if (departmentIds.length === 0) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            statusCode: 400,
            message: 'departmentIds must contain at least one valid ID',
          });
        }
        
        // Validate all department IDs
        for (const id of departmentIds) {
          if (isNaN(id) || id <= 0) {
            return res.status(HttpStatus.BAD_REQUEST).json({
              statusCode: 400,
              message: 'All departmentIds must be valid positive numbers',
            });
          }
        }
      } catch (error) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Invalid departmentIds format. Expected format: "[1,2,3,4]"',
        });
      }
      
      const imageUrl = await this.campaignService.uploadImageToS3(file);
      const campaign = await this.campaignService.createCampaign({
        ...body,
        votingStyle: body.votingStyle as 'TOKEN_BASED' | 'STORY_FEATURE' | 'THEMED_BADGES',
        startDate,
        endDate,
        url: imageUrl,
        departmentIds: departmentIds,
      });
      return res.status(HttpStatus.CREATED).json({
        statusCode: 201,
        message: 'Campaign created successfully',
        data: campaign,
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: 409,
          message: 'A campaign with the same name, startDate, endDate, and votingStyle already exists.',
        });
      }
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
      const campaigns = await this.campaignService.findAll();
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Campaigns fetched successfully',
        data: campaigns,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }





  @Get(':id')
  async getCampaign(@Param('id') id: string, @Res() res: Response) {
    try {
      const campaign = await this.campaignService.getCampaignWithProjects(+id);
      if (!campaign) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: 404,
          message: 'Campaign not found',
        });
      }
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Campaign fetched successfully',
        data: campaign,
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