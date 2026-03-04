import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectService } from './project.service';
import { ProjectTriggerService } from './project-trigger.service';
import { Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Controller('project')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly projectTriggerService: ProjectTriggerService
  ) { }

  @Get()
  async getAll(@Res() res: Response) {
    try {
      const projects = await this.projectService.getAllProjects();
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Projects fetched successfully',
        data: projects,
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
  async getOne(@Param('id') id: string, @Res() res: Response) {
    try {
      const projectId = parseInt(id, 10);
      if (isNaN(projectId) || projectId <= 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Invalid project ID. Must be a positive number.',
        });
      }

      const project = await this.projectService.getOne(projectId);
      if (!project) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: 404,
          message: 'Project not found',
        });
      }
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Project fetched successfully',
        data: project,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  @Get('trigger/status')
  async getTriggerStatus(@Res() res: Response) {
    try {
      const status = this.projectTriggerService.getQueueStatus();
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Project trigger status fetched successfully',
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

  @Post('filter')
  async filterProjects(@Body() filters: any, @Res() res: Response) {
    try {
      const projects = await this.projectService.filterProjects(filters);
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Filtered projects fetched successfully',
        data: projects,
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