import { Module } from '@nestjs/common';
import { CampaignProjectController } from './campaign_project.controller';
import { CampaignProjectService } from './campaign_project.service';

@Module({
  controllers: [CampaignProjectController],
  providers: [CampaignProjectService],
})
export class CampaignProjectModule {} 