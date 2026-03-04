import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from 'pg';
import { RecommendProjectsService } from '../recommend-projects/recommend-projects.service';

@Injectable()
export class ProjectTriggerService implements OnModuleInit {
  private readonly logger = new Logger(ProjectTriggerService.name);
  private pgClient: Client;
  private processingQueue: Array<{ consensusTimestamp: string; attempts?: number }> = [];
  private isProcessing = false;
  private readonly BATCH_SIZE = 1; // Process 1 project at a time due to 10-second API calls
  private readonly BATCH_DELAY = 3000; // 3 seconds between batches
  private readonly MAX_RETRIES = 3; // Max retry attempts per project

  constructor(
    private readonly recommendProjectsService: RecommendProjectsService
  ) {}

  async onModuleInit() {
    this.pgClient = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    await this.pgClient.connect();
    await this.pgClient.query('LISTEN project_created');

    this.pgClient.on('notification', async (msg) => {
      try {
        const payload = JSON.parse(msg.payload || '{}');
        this.logger.log(`📬 Project created notification received:`, payload);

        // Add to processing queue (only need consensusTimestamp)
        if (payload.consensusTimestamp) {
          this.processingQueue.push({
            consensusTimestamp: payload.consensusTimestamp,
            attempts: 0
          });

          this.logger.log(`📋 Added project ${payload.consensusTimestamp} to queue. Queue length: ${this.processingQueue.length}`);

          // Start processing if not already running
          if (!this.isProcessing) {
            // Use setImmediate to process asynchronously
            setImmediate(() => this.processQueue());
          }
        }
      } catch (error) {
        this.logger.error('Error processing project creation notification:', error);
      }
    });

    this.logger.log('🟢 PostgreSQL LISTEN is active on "project_created"');
  }

  private async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.logger.log(`🚀 Starting queue processing. Queue length: ${this.processingQueue.length}`);

    try {
      while (this.processingQueue.length > 0) {
        // Take one project at a time due to 10-second API calls
        const project = this.processingQueue.shift();
        
        if (!project) continue;

        this.logger.log(`🔄 Processing project with timestamp ${project.consensusTimestamp} (attempt ${(project.attempts || 0) + 1}/${this.MAX_RETRIES})`);
        
        try {
          // Start timing the API call
          const startTime = Date.now();
          
          // Call getVcByTimestamp to update the project
          const result = await this.recommendProjectsService.getVcByTimestamp(
            project.consensusTimestamp
          );

          const endTime = Date.now();
          const duration = (endTime - startTime) / 1000;
          
          this.logger.log(`✅ Successfully processed project ${project.consensusTimestamp} in ${duration}s`);
          
          // Log the result to verify the project was updated
          if (result && result.projectUpdated && result.projectUpdated.project) {
            const updatedProject = result.projectUpdated.project;
            this.logger.log(`📊 Project ${project.consensusTimestamp} updated with:`, {
              projectName: updatedProject.projectName,
              primarySector: updatedProject.primarySector,
              projectTypes: updatedProject.projectTypes,
              standards: updatedProject.standards,
              hasImpactData: !!updatedProject.impactAndRiskSdgs,
              hasRiskData: !!updatedProject.impactAndRiskAssessments
            });
          }
          
        } catch (error) {
          this.logger.error(`❌ Failed to process project ${project.consensusTimestamp}:`, error.message);
          
          // Retry logic
          const currentAttempts = (project.attempts || 0) + 1;
          if (currentAttempts < this.MAX_RETRIES) {
            this.logger.log(`🔄 Retrying project ${project.consensusTimestamp} (attempt ${currentAttempts}/${this.MAX_RETRIES})`);
            // Add back to queue for retry
            this.processingQueue.push({
              consensusTimestamp: project.consensusTimestamp,
              attempts: currentAttempts
            });
          } else {
            this.logger.error(`💥 Project ${project.consensusTimestamp} failed after ${this.MAX_RETRIES} attempts`);
          }
        }

        // Wait between processing each project (important for 10-second API calls)
        if (this.processingQueue.length > 0) {
          this.logger.log(`⏳ Waiting ${this.BATCH_DELAY}ms before processing next project...`);
          await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY));
        }
      }
    } catch (error) {
      this.logger.error('Error processing project queue:', error);
    } finally {
      this.isProcessing = false;
      this.logger.log(`🏁 Queue processing completed. Remaining items: ${this.processingQueue.length}`);
    }
  }

  // Method to manually trigger processing (for testing)
  async triggerProcessing() {
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  // Method to get queue status (for monitoring)
  getQueueStatus() {
    const secondsPerProject = (this.BATCH_DELAY / 1000) + 10; // 3 seconds delay + 10 seconds API call = 13 seconds
    const estimatedSeconds = this.processingQueue.length * secondsPerProject;
    
    return {
      queueLength: this.processingQueue.length,
      isProcessing: this.isProcessing,
      batchSize: this.BATCH_SIZE,
      batchDelay: this.BATCH_DELAY,
      maxRetries: this.MAX_RETRIES,
      estimatedTimeRemaining: {
        seconds: estimatedSeconds,
        minutes: Math.round(estimatedSeconds / 60 * 10) / 10, // Round to 1 decimal place
        humanReadable: `${Math.floor(estimatedSeconds / 60)}m ${estimatedSeconds % 60}s`
      }
    };
  }
} 