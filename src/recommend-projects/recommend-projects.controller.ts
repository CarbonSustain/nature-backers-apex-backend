import { Body, Controller, Get, Post, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { RecommendProjectsService } from './recommend-projects.service';

@Controller('recommend-projects')
export class RecommendProjectsController {
  constructor(private readonly recommendProjectsService: RecommendProjectsService) {}

  /**
   * Get available filter options for recommendations
   */
  @Get('filters')
  async getFilters(@Res() res: Response) {
    try {
      const filters = await this.recommendProjectsService.getFilters();
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Project filters fetched successfully',
        data: filters,
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
   * Get final project recommendations - NEW IMPLEMENTATION
   */
  @Post('final-recommendations')
  async getFinalRecommendations(
    @Body() criteria: any,
    @Res() res: Response
  ) {
    try {
      const recommendations = await this.recommendProjectsService.getFinalRecommendations(criteria);
      
      // Check if the service returned an error response
      if (recommendations && recommendations.success === false) {
        // Use different status codes based on error type
        let statusCode = HttpStatus.BAD_REQUEST;
        
        if (recommendations.error === 'NO_DOCUMENTS_FOUND') {
          statusCode = HttpStatus.NOT_FOUND; // 404 for no documents found
        } else if (recommendations.error === 'INDEXER_RETRIEVAL_FAILED') {
          statusCode = HttpStatus.SERVICE_UNAVAILABLE; // 503 for indexer service issues
        }
        
        return res.status(statusCode).json({
          statusCode: statusCode,
          message: recommendations.message,
          error: recommendations.error,
          details: recommendations.details,
          criteria: recommendations.criteria
        });
      }
      
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Final project recommendations retrieved successfully',
        data: recommendations
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
   * Get full VC data by consensusTimestamp and update project
   */
  @Post('get-vc-by-timestamp')
  async getVcByTimestamp(
    @Body() body: { consensusTimestamp: string },
    @Res() res: Response
  ) {
    try {
      // Validate required field
      if (!body.consensusTimestamp) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'consensusTimestamp is required',
        });
      }

      const result = await this.recommendProjectsService.getVcByTimestamp(body.consensusTimestamp);
      
      // Check if the service returned an error response
      if (result && result.success === false) {
        // Use different status codes based on error type
        let statusCode = HttpStatus.BAD_REQUEST;
        
        if (result.error === 'NO_VC_DATA') {
          statusCode = HttpStatus.NOT_FOUND; // 404 for no VC data found
        } else if (result.error === 'VC_RETRIEVAL_FAILED') {
          statusCode = HttpStatus.SERVICE_UNAVAILABLE; // 503 for indexer service issues
        }
        
        return res.status(statusCode).json({
          statusCode: statusCode,
          message: result.message,
          error: result.error,
          timestamp: result.timestamp,
          details: result.details
        });
      }
      
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'VC retrieved successfully by message ID',
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
} 