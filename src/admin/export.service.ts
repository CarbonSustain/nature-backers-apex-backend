import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import pptxgen from 'pptxgenjs';
import { Buffer } from 'buffer';

@Injectable()
export class ExportService {
  async exportToCsv(data: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Campaign Report');

    const headers = Object.keys(data);
    worksheet.addRow(headers);
    worksheet.addRow(headers.map(header => data[header]));

    const buffer = await workbook.csv.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportToPdf(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument();

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Campaign Report', { align: 'center' });
      doc.moveDown();

      Object.entries(data).forEach(([key, value]) => {
        doc.fontSize(12).text(`${key}: ${value}`);
        doc.moveDown(0.5);
      });

      doc.end();
    });
  }

  async exportToPpt(data: any): Promise<Buffer> {
    const pptx = new pptxgen();

    const slide1 = pptx.addSlide();
    slide1.addText('Campaign Report', {
      x: '10%',
      y: '40%',
      w: '80%',
      h: '20%',
      fontSize: 44,
      align: 'center',
      bold: true,
    });

    const slide2 = pptx.addSlide();
    const tableData = Object.entries(data).map(([key, value]) => [
      { text: key }, { text: String(value) },
    ]);
    slide2.addTable(
      [
        [{ text: 'Field' }, { text: 'Value' }],
        ...tableData,
      ],
      {
        x: '10%',
        y: '20%',
        w: '80%',
        colW: [3, 5],
      }
    );

    const ab = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
    return Buffer.from(new Uint8Array(ab));
  }

  async exportToJson(data: any): Promise<Buffer> {
    return Buffer.from(JSON.stringify(data, null, 2));
  }
}
