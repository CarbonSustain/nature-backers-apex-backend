import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client } from 'pg';
import { LambdaClient, InvokeCommand, InvocationType } from '@aws-sdk/client-lambda';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class PgListenerService implements OnModuleInit {
  private pgClient: Client;

  async onModuleInit() {
    // Check AWS credentials
    console.log('🔑 AWS Credentials check:', {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      region: 'us-west-1'
    });

    this.pgClient = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false, 
        },
      });

    await this.pgClient.connect();
    // Listen to the existing campaign_status_updated trigger
    await this.pgClient.query('LISTEN campaign_status_updated');

    this.pgClient.on('notification', async (msg) => {
      const payload = JSON.parse(msg.payload || '{}');
      console.log('📬 Campaign status updated:', payload);

      // Call Lambda for status-based actions
      console.log(`🔄 Campaign status changed to ${payload.new_status} - calling status actions Lambda`);
      
      const lambda = new LambdaClient({
        region: 'us-west-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const params = {
        FunctionName: 'campaign-status-actions-handler', // New Lambda for status actions
        InvocationType: InvocationType.Event,
        Payload: Buffer.from(JSON.stringify({ 
          campaign: payload,
          trigger: 'campaign_status_changed'
        })),
      };

      try {
        console.log('🔧 Status actions Lambda invocation details:', {
          FunctionName: params.FunctionName,
          Region: 'us-west-1',
          PayloadSize: params.Payload.length,
          PayloadPreview: JSON.stringify({ 
            campaign: payload,
            trigger: 'campaign_status_changed'
          }).substring(0, 200) + '...'
        });
        
        const result = await lambda.send(new InvokeCommand(params));
        console.log(`✅ Status actions Lambda triggered successfully for status: ${payload.new_status}`);
        console.log('📊 Lambda response:', {
          StatusCode: result.StatusCode,
          FunctionError: result.FunctionError,
          LogResult: result.LogResult
        });
      } catch (err) {
        console.error('❌ Status actions Lambda invoke failed:', err);
        console.error('🔍 Error details:', {
          name: err.name,
          message: err.message,
          code: err.code,
          statusCode: err.$metadata?.httpStatusCode
        });
      }
    });

    console.log('🟢 PostgreSQL LISTEN is active on "campaign_status_updated"');
  }
} 