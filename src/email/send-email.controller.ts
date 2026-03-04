import { Controller, Post, Body, HttpException, HttpStatus, Get } from '@nestjs/common';
import { SendEmailService } from './send-email.service';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

@Controller('send-emails')
export class SendEmailController {
  constructor(private readonly sendEmailService: SendEmailService) {}

  @Post('campaign')
  async sendBulkEmails(@Body('campaignId') campaignId: number) {
    if (!campaignId) {
      throw new HttpException('campaignId is required', HttpStatus.BAD_REQUEST);
    }

    try {
          const users = await this.sendEmailService.sendEmailsByCampaign(campaignId);
    console.log(users);
    return { users };
    } catch (err) {
      console.error(err);
      throw new HttpException('Failed to send emails', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('test-ses')
  async testSES() {
    try {
      const sesClient = new SESClient({ 
        region: process.env.AWS_SES_REGION || 'us-west-1',
        credentials: {
          accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
        },
      });

      const command = new SendEmailCommand({
        Source: process.env.AWS_SES_FROM_EMAIL || process.env.SES_SOURCE_EMAIL,
        Destination: {
          ToAddresses: [process.env.AWS_SES_FROM_EMAIL || process.env.SES_SOURCE_EMAIL], // Send to yourself for testing
        },
        Message: {
          Subject: {
            Data: 'SES Test Email',
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: '<h1>SES is working!</h1><p>Your email service is configured correctly.</p>',
              Charset: 'UTF-8',
            },
            Text: {
              Data: 'SES is working! Your email service is configured correctly.',
              Charset: 'UTF-8',
            },
          },
        },
      });

      const result = await sesClient.send(command);
      return { 
        message: 'Test email sent successfully', 
        messageId: result.MessageId,
        sesConfig: {
          region: process.env.AWS_SES_REGION,
          fromEmail: process.env.AWS_SES_FROM_EMAIL || process.env.SES_SOURCE_EMAIL,
        }
      };
    } catch (error) {
      console.error('SES Test Error:', error);
      throw new HttpException(
        `SES Test Failed: ${error.message}`, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
