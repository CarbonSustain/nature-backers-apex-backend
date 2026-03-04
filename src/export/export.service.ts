import { Injectable } from '@nestjs/common';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import PptxGenJS from 'pptxgenjs';
import * as fs from 'fs';
import { ReportData, normalizeReportData } from 'src/utils/reportNormalize';

@Injectable()
export class ExportService {
  async exportCampaignsAsCSV(campaigns: any[]): Promise<Buffer> {
    const mappedCampaigns = campaigns.map((c) => {
      const topProjects = c.topProjects || [];
      const sdgGoals = c.sdgGoals || [];
      return {
        'Campaign Name': c.campaignName || c.name || '',
        'Department / Team': c.departmentsParticipated || '',
        'Reporting Period Start': c.startDate || '',
        'Reporting Period End': c.endDate || '',
        'Prepared By': c.preparedBy || '',
        'Report Date': c.reportDate || '',
        'Campaign Purpose': c.campaignPurpose || '',
        'Campaign Mechanics': c.campaignMechanics || '',
        'Total Employees Engaged': c.employeesEngaged || '',
        'Projects Voted On': c.projectsVotedOn || '',
        'Most Voted Project': c.mostVotedProject || '',
        'Department Engagement Rate': c.departmentEngagementRate || '',
        'Top Project 1 Title': topProjects[0]?.title || '',
        'Top Project 1 Votes': topProjects[0]?.votes || '',
        'Top Project 2 Title': topProjects[1]?.title || '',
        'Top Project 2 Votes': topProjects[1]?.votes || '',
        'Top Project 3 Title': topProjects[2]?.title || '',
        'Top Project 3 Votes': topProjects[2]?.votes || '',
        'Estimated CO2 Impact': c.estimatedCO2Impact || '',
        'Biodiversity Benefit': c.biodiversityBenefit || '',
        'Social Impact': c.socialImpact || '',
        'Women-led Projects Supported': c.womenLedProjects || '',
        'SDG 1 Number': sdgGoals[0]?.number || '',
        'SDG 1 Name': sdgGoals[0]?.name || '',
        'SDG 1 Description': sdgGoals[0]?.description || '',
        'SDG 1 Projects Aligned': sdgGoals[0]?.projectsAligned || '',
        'SDG 2 Number': sdgGoals[1]?.number || '',
        'SDG 2 Name': sdgGoals[1]?.name || '',
        'SDG 2 Description': sdgGoals[1]?.description || '',
        'SDG 2 Projects Aligned': sdgGoals[1]?.projectsAligned || '',
        'SDG 3 Number': sdgGoals[2]?.number || '',
        'SDG 3 Name': sdgGoals[2]?.name || '',
        'SDG 3 Description': sdgGoals[2]?.description || '',
        'SDG 3 Projects Aligned': sdgGoals[2]?.projectsAligned || '',
        'Employee Insights': Array.isArray(c.employeeInsights)
          ? c.employeeInsights.map((e: any) => e.quote).join(' | ')
          : '',
        'Lessons Learned': Array.isArray(c.lessonsLearned) ? c.lessonsLearned.join(' | ') : '',
        Recommendations: Array.isArray(c.recommendations) ? c.recommendations.join(' | ') : '',
        'Contact Email': c.contactEmail || '',
        'Platform Link': c.platformLink || '',
      };
    });

    const fields = Object.keys(mappedCampaigns[0] || {});
    const parser = new Parser({ fields });
    const csv = parser.parse(mappedCampaigns);
    return Buffer.from(csv);
  }

  // ❗ FIX: this method is synchronous; remove `async` so return type can be Partial<ReportData>
  composeReportData({
    exportCampaign,
    summary,
    topProjects,
    sdgGoals,
    preparedBy,
    platformLink,
    contactEmail,
  }: {
    exportCampaign: {
      campaignName: string;
      departmentsParticipated: string;
      startDate: string | Date;
      endDate: string | Date;
      mostVotedProject?: string;
    };
    summary: {
      employeesEngaged: number;
      votesCast: number;
      verifiedProjects: number;
      participationRatePct: number; // 0..1
      estimatedCO2ImpactTons: number;
      projectsVotedOn: number;
      departmentEngagementRatePct: number; // 0..1
      biodiversityBenefit?: string;
      socialImpact?: string;
      womenLedProjects?: string;
    };
    topProjects: Array<{ title: string; location: string; type: string; votes: number; description: string }>;
    sdgGoals: Array<{ number: number | string; name: string; description: string; projectsAligned: number | string }>;
    preparedBy: string;
    platformLink: string;
    contactEmail: string;
  }): Partial<ReportData> {
    // Proper % formatting (e.g., 0.456 -> "45.6%")
    const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

    return {
      // Executive Summary
      employeesEngaged: summary.employeesEngaged,
      votesCast: summary.votesCast,
      verifiedProjects: summary.verifiedProjects,
      participationRate: pct(summary.participationRatePct),
      estimatedCO2Impact: `${summary.estimatedCO2ImpactTons} tCO2e`,

      // Campaign details
      campaignName: exportCampaign.campaignName,
      departmentsParticipated: exportCampaign.departmentsParticipated,
      startDate: exportCampaign.startDate as any,
      endDate: exportCampaign.endDate as any,
      preparedBy,
      reportDate: new Date() as any,

      // Overview / Mechanics
      campaignPurpose: 'Drive employee engagement in regenerative projects.',
      campaignMechanics:
        'Employees review projects and cast votes via Nature Backers; top projects proceed to funding review.',

      // Snapshot
      projectsVotedOn: summary.projectsVotedOn,
      mostVotedProject: exportCampaign.mostVotedProject ?? '',
      departmentEngagementRate: pct(summary.departmentEngagementRatePct),

      // Lists
      topProjects,
      sdgGoals,

      // Impact
      biodiversityBenefit: summary.biodiversityBenefit ?? '',
      socialImpact: summary.socialImpact ?? '',
      womenLedProjects: summary.womenLedProjects ?? '',

      // Optional sections
      employeeInsights: [],
      lessonsLearned: [],
      recommendations: [],

      // Footer
      contactEmail,
      platformLink,
    };
  }

  async toPDF(rawData: Partial<ReportData>): Promise<Buffer> {
    const data = normalizeReportData(rawData);

    // Ensure arrays exist to avoid runtime errors
    data.topProjects = Array.isArray(data.topProjects) ? data.topProjects : [];
    data.sdgGoals = Array.isArray(data.sdgGoals) ? data.sdgGoals : [];
    data.employeeInsights = Array.isArray(data.employeeInsights) ? data.employeeInsights : [];
    data.lessonsLearned = Array.isArray(data.lessonsLearned) ? data.lessonsLearned : [];
    data.recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];

    const doc = new PDFDocument({ margin: 40 });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    const logoPath = 'src/assets/naturewired-logo.png';
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, doc.page.width - 150, 20, { width: 100 });
    }

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text('Nature Backers Campaign Report', { align: 'left' });
    doc.moveDown();

    // Executive Summary
    doc.fontSize(14).font('Helvetica-Bold').text('Executive Summary');
    doc.fontSize(12).font('Helvetica').list([
      `# Employees Engaged: ${data.employeesEngaged ?? ''}`,
      `# Votes Cast: ${data.votesCast ?? ''}`,
      `# Verified Projects: ${data.verifiedProjects ?? ''}`,
      `Participation Rate: ${data.participationRate ?? ''}`,
      `Estimated CO2 Impact: ${data.estimatedCO2Impact ?? ''}`,
    ]);
    doc.moveDown();

    // Campaign Details
    doc.fontSize(14).font('Helvetica-Bold').text('Campaign Details');
    doc.fontSize(12).font('Helvetica').text(`Campaign Name: ${data.campaignName ?? ''}`);
    doc.text(`Department / Team: ${data.departmentsParticipated ?? ''}`);
    doc.text(`Reporting Period: ${data.startDate ?? ''} - ${data.endDate ?? ''}`);
    doc.text(`Prepared by: ${data.preparedBy ?? ''}`);
    doc.text(`Date: ${data.reportDate ?? ''}`);
    doc.moveDown();

    // Campaign Overview
    doc.fontSize(14).font('Helvetica-Bold').text('Campaign Overview');
    doc.fontSize(12).font('Helvetica').text(`Purpose: ${data.campaignPurpose ?? ''}`);
    doc.moveDown();

    // Campaign Mechanics
    doc.fontSize(14).font('Helvetica-Bold').text('Campaign Mechanics');
    doc.fontSize(12).font('Helvetica').text(`${data.campaignMechanics ?? ''}`);
    doc.moveDown();

    // Participation Snapshot
    doc.fontSize(14).font('Helvetica-Bold').text('Participation Snapshot');
    doc.fontSize(12).font('Helvetica').text(`Total Employees Engaged: ${data.employeesEngaged ?? ''}`);
    doc.text(`Projects Voted On: ${data.projectsVotedOn ?? ''}`);
    doc.text(`Most Voted Project: ${data.mostVotedProject ?? ''}`);
    doc.text(`Department Engagement Rate: ${data.departmentEngagementRate ?? ''}`);
    doc.moveDown();

    // Top 3 Projects by Votes
    doc.fontSize(14).font('Helvetica-Bold').text('Top 3 Projects by Votes');
    doc.fontSize(12).font('Helvetica');
    doc.text('Rank   Project Title   Location   Type   Votes   Description & Story Highlight');
    const topProjects = (data.topProjects || []).slice(0, 3);
    for (let i = 0; i < topProjects.length; i++) {
      const p = topProjects[i];
      doc.text(`${i + 1}   ${p.title ?? ''}   ${p.location ?? ''}   ${p.type ?? ''}   ${p.votes ?? ''}   ${p.description ?? ''}`);
    }
    doc.moveDown();

    // Impact Metrics
    doc.fontSize(14).font('Helvetica-Bold').text('Impact Metrics');
    doc.fontSize(12).font('Helvetica');
    doc.text('Metric   Total');
    doc.text(`Estimated CO2 Sequestration Supported   ${data.estimatedCO2Impact ?? ''}`);
    doc.text(`Biodiversity Benefit (species supported)   ${data.biodiversityBenefit ?? ''}`);
    doc.text(`Social Impact (communities reached)   ${data.socialImpact ?? ''}`);
    doc.text(`Women-led Projects Supported   ${data.womenLedProjects ?? ''}`);
    doc.moveDown();

    // SDG Goals Supported
    doc.fontSize(14).font('Helvetica-Bold').text('SDG Goals Supported');
    doc.fontSize(12).font('Helvetica');
    doc.text('SDG #   Goal Name   Description   Projects Aligned');
    for (const g of data.sdgGoals || []) {
      doc.text(`${g.number ?? ''}   ${g.name ?? ''}   ${g.description ?? ''}   ${g.projectsAligned ?? ''}`);
    }
    doc.moveDown();

    // Employee Insights
    if ((data.employeeInsights || []).length) {
      doc.fontSize(14).font('Helvetica-Bold').text('Employee Insights');
      doc.fontSize(12).font('Helvetica');
      for (const insight of data.employeeInsights!) {
        doc.text(`"${insight.quote ?? ''}" – ${insight.author ?? ''}`);
      }
      doc.moveDown();
    }

    // Lessons Learned
    if ((data.lessonsLearned || []).length) {
      doc.fontSize(14).font('Helvetica-Bold').text('Lessons Learned');
      doc.fontSize(12).font('Helvetica');
      for (const lesson of data.lessonsLearned!) doc.text(`• ${lesson ?? ''}`);
      doc.moveDown();
    }

    // Recommendations
    if ((data.recommendations || []).length) {
      doc.fontSize(14).font('Helvetica-Bold').text('Recommendations');
      doc.fontSize(12).font('Helvetica');
      for (const rec of data.recommendations!) doc.text(`• ${rec ?? ''}`);
      doc.moveDown();
    }

    // Contact
    doc.text(data.contactEmail ?? '');
    doc.text(data.platformLink ?? '');

    doc.end();
    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }

  prettifyKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  async toPPTX(data: any): Promise<Buffer> {
    const pptx = new PptxGenJS();
    const logoPath = 'src/assets/naturewired-logo.png';

    function addLogo(slide: any) {
      if (fs.existsSync(logoPath)) {
        const imageBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
        slide.addImage({ data: 'data:image/png;base64,' + imageBase64, x: 8, y: 0.2, w: 2, h: 1 });
      }
    }

    // Slide 1: Title
    let slide = pptx.addSlide();
    addLogo(slide);
    slide.addText('Nature Backers Campaign Report', {
      x: 1.5,
      y: 2.5,
      fontSize: 32,
      bold: true,
      align: 'center',
      w: 6,
      h: 1,
    });

    // Slide 2: Executive Summary
    slide = pptx.addSlide();
    addLogo(slide);
    slide.addText('Executive Summary', { x: 0.5, y: 0.5, fontSize: 22, bold: true });
    let y1 = 1.2;
    const summaryLines = [
      `• # Employees Engaged: ${data.employeesEngaged ?? '[Insert]'}`,
      `• # Votes Cast: ${data.votesCast ?? '[Insert]'}`,
      `• # Verified Projects: ${data.verifiedProjects ?? '[Insert]'}`,
      `• Participation Rate: ${data.participationRate ?? '[Insert]'}`,
      `• Estimated CO₂ Impact: ${data.estimatedCO2Impact ?? '[Insert]'}`,
    ];
    for (const line of summaryLines) {
      slide.addText(line, { x: 1, y: y1, fontSize: 16 });
      y1 += 0.5;
    }

    // Slide 3: Campaign Details
    slide = pptx.addSlide();
    addLogo(slide);
    slide.addText('Campaign Details', { x: 0.5, y: 0.5, fontSize: 22, bold: true });
    let y2 = 1.2;
    const detailsLines = [
      `Campaign Name: ${data.campaignName ?? '[Insert]'}`,
      `Department / Team: ${data.departmentsParticipated ?? '[Insert]'}`,
      `Reporting Period: ${data.startDate ?? '[Insert]'} - ${data.endDate ?? '[Insert]'}`,
      `Prepared by: ${data.preparedBy ?? '[Insert]'}`,
      `Date: ${data.reportDate ?? '[Insert]'}`,
    ];
    for (const line of detailsLines) {
      slide.addText(line, { x: 1, y: y2, fontSize: 16 });
      y2 += 0.5;
    }

    // Slide 4: Campaign Overview & Mechanics
    slide = pptx.addSlide();
    addLogo(slide);
    slide.addText('Campaign Overview', { x: 0.5, y: 0.5, fontSize: 22, bold: true });
    let y4 = 1.2;
    slide.addText(`Purpose: ${data.campaignPurpose ?? '[Insert campaign purpose]'}`, { x: 1, y: y4, fontSize: 16 });
    y4 += 0.7;
    slide.addText('Campaign Mechanics', { x: 0.5, y: y4, fontSize: 22, bold: true });
    y4 += 0.7;
    slide.addText(`${data.campaignMechanics ?? '[Insert explanation of voting, platform, etc.]'}`, {
      x: 1,
      y: y4,
      fontSize: 16,
    });

    // Slide 5: Participation Snapshot & Top Projects
    slide = pptx.addSlide();
    addLogo(slide);
    slide.addText('Participation Snapshot', { x: 0.5, y: 0.5, fontSize: 22, bold: true });
    let y5 = 1.2;
    const snapshotLines = [
      `Total Employees Engaged: ${data.employeesEngaged ?? '[Insert]'}`,
      `Projects Voted On: ${data.projectsVotedOn ?? '[Insert]'}`,
      `Most Voted Project: ${data.mostVotedProject ?? '[Insert]'}`,
      `Department Engagement Rate: ${data.departmentEngagementRate ?? '[Insert %]'}`,
    ];
    for (const line of snapshotLines) {
      slide.addText(line, { x: 1, y: y5, fontSize: 16 });
      y5 += 0.5;
    }
    slide.addText('Top 3 Projects by Votes', { x: 0.5, y: y5, fontSize: 22, bold: true });
    y5 += 0.7;
    slide.addText('Rank   Project Title   Location   Type   Votes   Description & Story Highlight', {
      x: 1,
      y: y5,
      fontSize: 16,
    });
    y5 += 0.4;
    const tp = (data.topProjects || []).slice(0, 3);
    for (let i = 0; i < 3; i++) {
      const p = tp[i] || {};
      slide.addText(
        `${i + 1}   ${p.title ?? '[Insert]'}   ${p.location ?? '[Insert]'}   ${p.type ?? '[Insert]'}   ${p.votes ?? '[Insert]'}   ${p.description ?? '[Insert]'}`,
        { x: 1, y: y5, fontSize: 16 },
      );
      y5 += 0.4;
    }

    // Slide 6: Impact Metrics
    slide = pptx.addSlide();
    addLogo(slide);
    slide.addText('Impact Metrics', { x: 0.5, y: 0.5, fontSize: 22, bold: true });
    let y6 = 1.2;
    slide.addText('Metric   Total', { x: 1, y: y6, fontSize: 16 });
    y6 += 0.4;
    slide.addText(`Estimated CO₂ Sequestration Supported   ${data.estimatedCO2Impact ?? '[Insert]'}`, {
      x: 1,
      y: y6,
      fontSize: 16,
    });
    y6 += 0.4;
    slide.addText(`Biodiversity Benefit (species supported)   ${data.biodiversityBenefit ?? '[Insert]'}`, {
      x: 1,
      y: y6,
      fontSize: 16,
    });
    y6 += 0.4;
    slide.addText(`Social Impact (communities reached)   ${data.socialImpact ?? '[Insert]'}`, {
      x: 1,
      y: y6,
      fontSize: 16,
    });
    y6 += 0.4;
    slide.addText(`Women-led Projects Supported   ${data.womenLedProjects ?? '[Insert]'}`, {
      x: 1,
      y: y6,
      fontSize: 16,
    });

    // Slide 7+: SDG Goals Supported (Paginated)
    const sdgs = data.sdgGoals || [];
    const rowsPerSlide = 5;
    const totalPages = Math.max(1, Math.ceil(sdgs.length / rowsPerSlide));
    for (let page = 0; page < totalPages; page++) {
      slide = pptx.addSlide();
      addLogo(slide);
      slide.addText('SDG Goals Supported', { x: 0.5, y: 0.5, fontSize: 22, bold: true });
      let y = 1.2;
      slide.addText('SDG #   Goal Name   Description   Projects Aligned', { x: 1, y, fontSize: 16 });
      y += 0.4;
      for (let i = 0; i < rowsPerSlide; i++) {
        const idx = page * rowsPerSlide + i;
        if (idx >= sdgs.length) break;
        const g = sdgs[idx] || {};
        slide.addText(
          `${g.number ?? '[Insert]'}   ${g.name ?? '[Insert]'}   ${g.description ?? '[Insert]'}   ${g.projectsAligned ?? '[Insert]'}`,
          { x: 1, y, fontSize: 16 },
        );
        y += 0.4;
      }
    }

    // Slide 8: Employee Insights, Lessons Learned, Recommendations, Contact
    slide = pptx.addSlide();
    addLogo(slide);
    slide.addText('Employee Insights', { x: 0.5, y: 0.5, fontSize: 22, bold: true });
    let y8 = 1.2;
    const insights = data.employeeInsights || [];
    for (const insight of insights) {
      slide.addText(
        `"${insight?.quote ?? '[Insert employee quote or feedback]'}" – ${insight?.author ?? '[Role or Team]'}`,
        { x: 1, y: y8, fontSize: 16 },
      );
      y8 += 0.4;
    }
    y8 += 0.3;
    slide.addText('Lessons Learned', { x: 0.5, y: y8, fontSize: 22, bold: true });
    y8 += 0.7;
    const lessons = data.lessonsLearned || [];
    for (const lesson of lessons) {
      slide.addText(`• ${lesson ?? '[Insert lesson or insight]'}`, { x: 1, y: y8, fontSize: 16 });
      y8 += 0.4;
    }
    y8 += 0.3;
    slide.addText('Recommendations', { x: 0.5, y: y8, fontSize: 22, bold: true });
    y8 += 0.7;
    const recs = data.recommendations || [];
    for (const rec of recs) {
      slide.addText(`• ${rec ?? '[Insert recommendation]'}`, { x: 1, y: y8, fontSize: 16 });
      y8 += 0.4;
    }
    y8 += 0.3;
    slide.addText(data.contactEmail ?? '[Insert contact email]', { x: 1, y: y8, fontSize: 16 });
    y8 += 0.4;
    slide.addText(data.platformLink ?? '[Insert website or platform link]', { x: 1, y: y8, fontSize: 16 });

    // Export to buffer
    return new Promise<Buffer>((resolve) => {
      (pptx as any).write('nodebuffer').then((buffer: Buffer) => resolve(buffer));
    });
  }

  async toJSON(data: any): Promise<Buffer> {
    return Buffer.from(JSON.stringify(data, null, 2));
  }
}
