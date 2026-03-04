import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { CampaignModule } from '../campaign/campaign.module';
 
@Module({
  imports: [CampaignModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {} 