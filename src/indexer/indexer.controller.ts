import { Controller, Get, Query, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { Response } from 'express';

@Controller('indexer')
export class IndexerController {
  constructor(private readonly indexerService: IndexerService) {}

  @Get('search')
  async search(@Query('q') q: string, @Res() res: Response) {
    try {
      const results = await this.indexerService.fullTextSearch(q);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: results,
        query: q
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'SEARCH_FAILED',
        message: error.message
      });
    }
  }

  @Get('health')
  async healthCheck(@Res() res: Response) {
    try {
      // Try a simple search to test connectivity
      const testResults = await this.indexerService.fullTextSearch('test');
      
      return res.status(HttpStatus.OK).json({
        success: true,
        status: 'healthy',
        message: 'Guardian Service is accessible',
        timestamp: new Date().toISOString(),
        testResults: testResults ? 'Search test passed' : 'Search test failed'
      });
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        success: false,
        status: 'unhealthy',
        error: 'SERVICE_UNAVAILABLE',
        message: 'Guardian Service is not accessible',
        timestamp: new Date().toISOString(),
        details: {
          error: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText
        }
      });
    }
  }

  @Post('documents-by-keywords')
  async getDocumentsByKeywords(@Body() keywords: any, @Res() res: Response) {
    try {
      const results = await this.indexerService.getDocumentsByKeywords(keywords);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: results,
        keywords: keywords
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'KEYWORDS_SEARCH_FAILED',
        message: error.message,
        keywords: keywords
      });
    }
  }

  @Get('vc/:consensusTimestamp')
  async getVcByMessageId(@Query('consensusTimestamp') consensusTimestamp: string, @Res() res: Response) {
    try {
      const result = await this.indexerService.getVcByMessageId(consensusTimestamp);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
        consensusTimestamp: consensusTimestamp
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'VC_RETRIEVAL_FAILED',
        message: error.message,
        consensusTimestamp: consensusTimestamp,
        details: {
          status: error.response?.status,
          statusText: error.response?.statusText
        }
      });
    }
  }
} 