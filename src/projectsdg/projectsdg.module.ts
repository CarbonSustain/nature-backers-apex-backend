import { Module } from '@nestjs/common';
import { ProjectSDGService } from './projectsdg.service';
import { ProjectSDGController } from './projectsdg.controller';

@Module({
  providers: [ProjectSDGService],
  controllers: [ProjectSDGController],
  exports: [ProjectSDGService],
})
export class ProjectSDGModule {} 