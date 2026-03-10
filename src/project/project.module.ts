import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { ProjectTriggerService } from './project-trigger.service';
import { memoryStorage } from 'multer';
import { ProjectSDGModule } from '../projectsdg/projectsdg.module';
import { RecommendProjectsModule } from '../recommend-projects/recommend-projects.module';
import { IndexerModule } from '../indexer/indexer.module';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(), // ✅ store files in memory (buffer)
    }),
    forwardRef(() => ProjectSDGModule),
    forwardRef(() => RecommendProjectsModule),
    IndexerModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService, ProjectTriggerService],
  exports: [ProjectService, ProjectTriggerService],
})
export class ProjectModule {}
