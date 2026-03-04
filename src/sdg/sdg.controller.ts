import { Body, Controller, Get, Param, Post, Res, HttpStatus } from '@nestjs/common';
import { SDGService } from './sdg.service';
import { Response } from 'express';

@Controller('sdg')
export class SDGController {
  constructor(private readonly sdgService: SDGService) {}

  @Post()
  async create(@Body() data: { name: string }, @Res() res: Response) {
    try {
      const sdg = await this.sdgService.create(data);
      return res.status(HttpStatus.CREATED).json({
        statusCode: 201,
        message: 'SDG created successfully',
        data: sdg,
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
      const sdgs = await this.sdgService.findAll();
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'SDGs fetched successfully',
        data: sdgs,
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