import {
  Body,
  Controller,
  Get,
  Inject,
  forwardRef,
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
import { RecommendProjectsService } from '../recommend-projects/recommend-projects.service';
import { IndexerService } from '../indexer/indexer.service';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Controller('project')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly projectTriggerService: ProjectTriggerService,
    @Inject(forwardRef(() => RecommendProjectsService))
    private readonly recommendProjectsService: RecommendProjectsService,
    private readonly indexerService: IndexerService,
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

  @Post('clear-cache')
  async clearCache(@Res() res: Response) {
    try {
      const result = await this.projectService.clearProjectCache();
      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: `Cache cleared: ${result.deleted} projects deleted, ${result.reset} projects reset`,
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Failed to clear project cache',
        error: error.message,
      });
    }
  }

  @Post('resync')
  async resync(@Res() res: Response) {
    try {
      // 1. Clear existing cache
      const cleared = await this.projectService.clearProjectCache();
      console.log(`[resync] cache cleared: deleted=${cleared.deleted} reset=${cleared.reset}`);

      // 2. Fetch fresh projects from blockchain (awaited — so we can return them immediately)
      const blockchainDocs = await this.indexerService.fetchUniqueProjects();
      console.log(`[resync] fetched ${blockchainDocs.length} projects from blockchain`);

      // 3. Map blockchain docs to display-friendly shape for the frontend
      const blockchainProjects = blockchainDocs.map(doc => ({
        uniqueId: doc.key,
        projectName: doc.name || null,
        description: doc.description !== 'N/A' ? doc.description : null,
        projectMethodology: doc.methodology || null,
        projectTypes: doc.projectTypes || null,
        primarySector: doc.primarySector || null,
        status: doc.status || null,
        consensusTimestamp: doc.timestamp || null,
        standards: doc.standards || null,
        verificationMethod: doc.verificationMethod || null,
        sdgs: [],
        CampaignProject: [],
        id: null,
      }));

      // 4. Load hardcoded projects and append them
      let hardcodedProjects: any[] = [];
      try {
        const hardcodedPath = path.join(process.cwd(), 'src', 'data', 'hardcoded-projects.json');
        if (fs.existsSync(hardcodedPath)) {
          const raw: any[] = JSON.parse(fs.readFileSync(hardcodedPath, 'utf-8'));
          hardcodedProjects = raw.map(hp => ({
            uniqueId: hp.uniqueId,
            projectName: hp.projectName || null,
            description: hp.description || null,
            projectMethodology: hp.projectMethodology || null,
            projectTypes: hp.projectTypes || null,
            primarySector: hp.primarySector || null,
            status: hp.status || 'Active',
            consensusTimestamp: null,
            standards: hp.standards || null,
            verificationMethod: null,
            sdgs: (hp.sdgIds || []).map((id: number) => ({ sdg: { id, name: '' } })),
            CampaignProject: [],
            id: null,
          }));
          console.log(`[resync] loaded ${hardcodedProjects.length} hardcoded projects`);
        }
      } catch (e) {
        console.warn('[resync] could not load hardcoded-projects.json:', e.message);
      }

      const projects = [...blockchainProjects, ...hardcodedProjects];

      // 5. Persist everything to DB in the background (fire-and-forget)
      this.recommendProjectsService.resyncAllProjects()
        .then(result => console.log('[resync] db sync completed:', JSON.stringify(result)))
        .catch(err => console.error('[resync] db sync failed:', err.message));

      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: `Fetched ${blockchainProjects.length} blockchain + ${hardcodedProjects.length} hardcoded projects. DB is syncing in the background.`,
        data: { cleared, projects },
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Failed to resync projects',
        error: error.message,
      });
    }
  }
}