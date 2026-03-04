import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { ProjectSDGService } from './projectsdg.service';
import { Response } from 'express';

@Controller('project-sdg')
export class ProjectSDGController {
  constructor(private readonly projectSDGService: ProjectSDGService) {}

  @Post('assign')
  async assign(@Body() body: { projectId: number; sdgId: number }, @Res() res: Response) {
    try {
      if (!body.projectId || !body.sdgId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'projectId and sdgId are required',
        });
      }
      const result = await this.projectSDGService.createAssociation(body.projectId, body.sdgId);
      return res.status(HttpStatus.CREATED).json({
        statusCode: 201,
        message: 'Project and SDG linked successfully',
        data: result,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: 409,
          message: 'This project-SDG association already exists.',
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