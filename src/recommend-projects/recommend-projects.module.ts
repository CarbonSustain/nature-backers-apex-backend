import { Module } from '@nestjs/common';
import { RecommendProjectsController } from './recommend-projects.controller';
import { RecommendProjectsService } from './recommend-projects.service';
import { IndexerModule } from '../indexer/indexer.module';

@Module({
  imports: [IndexerModule],
  controllers: [RecommendProjectsController],
  providers: [RecommendProjectsService],
  exports: [RecommendProjectsService],
})
export class RecommendProjectsModule {} 