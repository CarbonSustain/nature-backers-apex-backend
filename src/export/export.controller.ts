import { Controller, Post, Body, Res, Param, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { mapCampaignForExport } from './export.mapper';
import { CampaignService } from '../campaign/campaign.service';

@Controller('campaign-export')
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly campaignService: CampaignService,
  ) {}

  @Post('export/:id')
  async export(@Param('id') id: string, @Body() body: any, @Res() res: Response) {
    // Accept both 'exportFormat' and 'format' fields, and handle case-insensitive format values
    const exportFormat = (body.exportFormat || body.format || '').toLowerCase();
    
    if (!exportFormat) {
      return res.status(400).json({ 
        message: 'Missing export format. Please provide "exportFormat" or "format" field with value: csv, pdf, pptx, ppt, or json' 
      });
    }
    
    // Fetch campaign by ID
    const campaign = await this.campaignService.getCampaignWithProjects(Number(id));
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    const exportRow = mapCampaignForExport(campaign);
    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    if (exportFormat === 'csv') {
      buffer = await this.exportService.exportCampaignsAsCSV([exportRow]);
      filename = 'campaign_report.csv';
      contentType = 'text/csv';
    } else if (exportFormat === 'pdf') {
      buffer = await this.exportService.toPDF(exportRow);
      filename = 'campaign_report.pdf';
      contentType = 'application/pdf';
    } else if (exportFormat === 'pptx' || exportFormat === 'ppt') {
      buffer = await this.exportService.toPPTX(exportRow);
      filename = 'campaign_report.pptx';
      contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else if (exportFormat === 'json') {
      buffer = await this.exportService.toJSON(exportRow);
      filename = 'campaign_report.json';
      contentType = 'application/json';
    } else {
      return res.status(400).json({ message: 'Unsupported export format' });
    }

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }
}