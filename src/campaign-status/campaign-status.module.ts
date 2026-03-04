import { Module } from '@nestjs/common';
import { CampaignStatusController } from './campaign-status.controller';
import { CampaignStatusService } from './campaign-status.service';
import { EmailModule } from '../email/email.module';
import { VoteModule } from '../vote/vote.module';

@Module({
  imports: [EmailModule, VoteModule],
  controllers: [CampaignStatusController],
  providers: [CampaignStatusService],
  exports: [CampaignStatusService],
})
export class CampaignStatusModule {} 