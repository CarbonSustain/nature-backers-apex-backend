import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';

@Controller('admin/export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('csv')
  async exportToCsv(@Body() data: any, @Res() res: Response) {
    const buffer = await this.exportService.exportToCsv(data);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=campaign_report.csv',
    });
    res.send(buffer);
  }

  @Post('pdf')
  async exportToPdf(@Body() data: any, @Res() res: Response) {
    const buffer = await this.exportService.exportToPdf(data);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=campaign_report.pdf',
    });
    res.send(buffer);
  }

  @Post('ppt')
  async exportToPpt(@Body() data: any, @Res() res: Response) {
    const buffer = await this.exportService.exportToPpt(data);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': 'attachment; filename=campaign_report.pptx',
    });
    res.send(buffer);
  }

  @Post('json')
  async exportToJson(@Body() data: any, @Res() res: Response) {
    const buffer = await this.exportService.exportToJson(data);
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename=campaign_report.json',
    });
    res.send(buffer);
  }
} 