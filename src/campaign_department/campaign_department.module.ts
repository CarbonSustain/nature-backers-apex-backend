import { Module } from '@nestjs/common';
import { CampaignDepartmentController } from './campaign_department.controller';
import { CampaignDepartmentService } from './campaign_department.service';

@Module({
  controllers: [CampaignDepartmentController],
  providers: [CampaignDepartmentService],
})
export class CampaignDepartmentModule {} 