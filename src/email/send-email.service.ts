import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as QRCode from 'qrcode';
const prisma = new PrismaClient();

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
@Injectable()
export class SendEmailService {
  async sendEmailsByCampaign(campaignId: number) {
    const campaignWithDepts = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        CampaignDepartment: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!campaignWithDepts || campaignWithDepts.CampaignDepartment.length === 0) {
      throw new Error('No department linked to this campaign');
    }

    // Get all departments for this campaign
    const departmentIds = campaignWithDepts.CampaignDepartment.map(cd => cd.departmentId);
    
    console.log('✅ Campaign departments:', departmentIds);

    // Get all users from all departments who have Employee role (role_id = 3)
    const users = await prisma.user.findMany({
      where: {
        departmentId: {
          in: departmentIds
        },
        role_id: 3 // Employee role
      },
      select: {
        business_email: true,
        first_name: true,
        last_name: true,
      },
    });

    if (users.length === 0) {
      throw new Error('No employees found in campaign departments');
    }

    console.log('✅ Employees found:', users.map(u => u.business_email));

    const campaignLogoUrl = campaignWithDepts.url;
    const frontendUrl = process.env.REACT_FRONTEND_DOMAIN;
    const emailSubject = campaignWithDepts.emailSubject || `Campaign: ${campaignWithDepts.name}`;
    const emailBody = campaignWithDepts.emailBody || `Hello,\n\nYou have a new campaign: ${campaignWithDepts.name}`;

    // Single source of truth for campaign URL
    const campaignUrl = `${frontendUrl}auth/signin/?campaignId=${campaignId}`;

    // Generate QR code URL via public API (email clients block base64 inline images)
    const qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(campaignUrl)}`;

    const sesClient = new SESClient({ 
      region: process.env.AWS_REGION || 'us-west-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    }); 
    const results = [];
    const failedEmails = [];

    for (const user of users) {
      try {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        const htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Campaign Notification</title>
          </head>
          <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">Hello ${fullName},</h2>
              <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">${emailBody.replace(/\n/g, '<br/>')}</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${campaignUrl}" 
                   style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                  View Campaign
                </a>
              </div>
              
              <p style="color: #999; font-size: 14px; margin-bottom: 20px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${campaignUrl}" style="color: #007bff; word-break: break-all;">
                  ${campaignUrl}
                </a>
              </p>

              <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                <p style="color: #555; font-size: 14px; margin-bottom: 4px; font-weight: bold;">Scan to view campaign</p>
                <p style="color: #999; font-size: 12px; margin-bottom: 12px;">Use your phone camera to open the campaign link</p>
                <img src="${qrCodeDataUrl}" alt="Campaign QR Code" style="width: 200px; height: 200px; display: inline-block;" />
              </div>
              
              <div style="text-align:center; margin-top:32px;">
                <img src="${campaignLogoUrl}" alt="Campaign Logo" style="max-width:80%; width:400px; border-radius:8px; display:inline-block;" />
              </div>
              
              <div style="margin-top: 20px; text-align: left; padding-top: 20px; border-top: 1px solid #eee;">
                <span style="color: #999; font-size: 12px;">Powered by:</span>
                <img src="${process.env.BACKEND_CLOUDFRONT_URL}uploads/assets/naturewired-logo.png" alt="Nature Wired" style="height: 24px; vertical-align: middle; display: inline-block; margin-left: 8px;" />
              </div>
            </div>
          </body>
          </html>
        `;
        const textBody = `Hello ${fullName},\n\n${emailBody}\n\nView the campaign here: ${campaignUrl}`;
        const command = new SendEmailCommand({
          Destination: {
            ToAddresses: [user.business_email],
          },
          Message: {
            Subject: {
              Data: emailSubject,
            },
            Body: {
              Html: { Data: htmlBody },
              Text: { Data: textBody },
            },
          },
          Source: process.env.AWS_SES_FROM_EMAIL || process.env.SES_SOURCE_EMAIL, 
        });

        await sesClient.send(command);
        console.log(`✅ Email sent successfully to: ${user.business_email}`);
        results.push({ email: user.business_email, status: 'success' });
      } catch (error) {
        console.log(`❌ Failed to send email to ${user.business_email}: ${error.message}`);
        failedEmails.push({ email: user.business_email, error: error.message });
      }
    }

    const successCount = results.length;
    const failureCount = failedEmails.length;
    
    console.log(`📧 Email sending completed: ${successCount} successful, ${failureCount} failed`);
    
    if (failedEmails.length > 0) {
      console.log(`❌ Failed emails:`, failedEmails.map(f => f.email).join(', '));
    }

    return { 
      message: `Emails sent: ${successCount} successful, ${failureCount} failed`,
      successful: successCount,
      failed: failureCount,
      failedEmails: failedEmails
    };
  }
}