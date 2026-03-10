import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SendEmailService } from '../email/send-email.service';
import { VoteService } from '../vote/vote.service';

const prisma = new PrismaClient();

@Injectable()
export class CampaignStatusService {
  private readonly logger = new Logger(CampaignStatusService.name);
  
  constructor(
    private readonly emailService: SendEmailService,
    private readonly voteService: VoteService
  ) {}
  async create(data: { name: string }) {
    return prisma.campaignStatus.create({ data });
  }

  async findAll() {
    return prisma.campaignStatus.findMany({
      orderBy: { id: 'asc' }
    });
  }

  /**
   * Convert "Created" campaigns to "Active" when current time is between start_date and end_date
   */
  async activateCreatedCampaigns() {
    const now = new Date().toISOString();
    
    // Find campaigns that are "Created" and should be "Active"
    const campaignsToActivate = await prisma.campaign.findMany({
      where: {
        campaignStatus: {
          name: 'Created'
        },
        startDate: {
          lte: now
        },
        endDate: {
          gte: now
        }
      },
      include: {
        campaignStatus: true
      }
    });

    if (campaignsToActivate.length === 0) {
      return {
        message: 'No campaigns to activate',
        activatedCount: 0,
        campaigns: []
      };
    }

    // Get the "Active" status ID
    const activeStatus = await prisma.campaignStatus.findUnique({
      where: { name: 'Active' }
    });

    if (!activeStatus) {
      throw new Error('Active status not found in database');
    }

    // Update campaigns to "Active"
    const updatePromises = campaignsToActivate.map(async (campaign) => {
      const updatedCampaign = await prisma.campaign.update({
        where: { id: campaign.id },
        data: { campaignStatusId: activeStatus.id }
      });
      
      return updatedCampaign;
    });

    const updatedCampaigns = await Promise.all(updatePromises);

    return {
      message: `Activated ${updatedCampaigns.length} campaigns`,
      activatedCount: updatedCampaigns.length,
      campaigns: updatedCampaigns
    };
  }

  /**
   * Convert "Active" campaigns to "Pending" when current time > end_date
   */
  async setActiveCampaignsToPending() {
    const now = new Date().toISOString();
    
    // Find campaigns that are "Active" and should be "Pending"
    const campaignsToPending = await prisma.campaign.findMany({
      where: {
        campaignStatus: {
          name: 'Active'
        },
        endDate: {
          lt: now
        }
      },
      include: {
        campaignStatus: true
      }
    });

    if (campaignsToPending.length === 0) {
      return {
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      };
    }

    // Get the "Pending" status ID
    const pendingStatus = await prisma.campaignStatus.findUnique({
      where: { name: 'Pending' }
    });

    if (!pendingStatus) {
      throw new Error('Pending status not found in database');
    }

    // Update campaigns to "Pending"
    const updatePromises = campaignsToPending.map(async (campaign) => {
      const updatedCampaign = await prisma.campaign.update({
        where: { id: campaign.id },
        data: { campaignStatusId: pendingStatus.id }
      });
      
      return updatedCampaign;
    });

    const updatedCampaigns = await Promise.all(updatePromises);

    return {
      message: `Set ${updatedCampaigns.length} campaigns to pending`,
      pendingCount: updatedCampaigns.length,
      campaigns: updatedCampaigns
    };
  }

  /**
   * Convert "Created" campaigns to "Pending" when they are completely in the past
   * (both start_date and end_date are before current time)
   */
  async setCreatedCampaignsToPending() {
    const now = new Date().toISOString();
    
    // Find campaigns that are "Created" and completely in the past
    const campaignsToPending = await prisma.campaign.findMany({
      where: {
        campaignStatus: {
          name: 'Created'
        },
        endDate: {
          lt: now
        }
      },
      include: {
        campaignStatus: true
      }
    });

    if (campaignsToPending.length === 0) {
      return {
        message: 'No created campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      };
    }

    // Get the "Pending" status ID
    const pendingStatus = await prisma.campaignStatus.findUnique({
      where: { name: 'Pending' }
    });

    if (!pendingStatus) {
      throw new Error('Pending status not found in database');
    }

    // Update campaigns to "Pending"
    const updatePromises = campaignsToPending.map(async (campaign) => {
      const updatedCampaign = await prisma.campaign.update({
        where: { id: campaign.id },
        data: { campaignStatusId: pendingStatus.id }
      });
      
      return updatedCampaign;
    });

    const updatedCampaigns = await Promise.all(updatePromises);

    return {
      message: `Set ${updatedCampaigns.length} created campaigns to pending`,
      pendingCount: updatedCampaigns.length,
      campaigns: updatedCampaigns
    };
  }

  /**
   * Update all campaign statuses based on current time
   * This combines both operations for efficiency
   */
  async updateAllCampaignStatuses() {
    // First, handle campaigns that are completely in the past (Created -> Pending)
    const createdToPendingResult = await this.setCreatedCampaignsToPending();
    
    // Then handle normal transitions
    const activateResult = await this.activateCreatedCampaigns();
    const pendingResult = await this.setActiveCampaignsToPending();
    
    // Finally, handle expired campaigns with no votes (set to Cancelled)
    const cancelExpiredResult = await this.cancelExpiredCampaignsWithNoVotes();

    return {
      message: 'Campaign statuses updated',
      createdToPendingResult,
      activateResult,
      pendingResult,
      cancelExpiredResult,
      totalUpdated: createdToPendingResult.pendingCount + activateResult.activatedCount + pendingResult.pendingCount + cancelExpiredResult.cancelledCount,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Manual approval of a campaign by admin
   * Only allowed from "Pending" status
   */
  async approveCampaign(campaignId: number) {
    // Get the campaign with current status
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        campaignStatus: true
      }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Only allow approval from "Pending" status
    if (campaign.campaignStatus.name !== 'Pending') {
      throw new Error(`Cannot approve campaign with status: ${campaign.campaignStatus.name}. Only campaigns with "Pending" status can be approved.`);
    }

    const approvedStatus = await prisma.campaignStatus.findUnique({
      where: { name: 'Approved' }
    });

    if (!approvedStatus) {
      throw new Error('Approved status not found in database');
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { campaignStatusId: approvedStatus.id },
      include: {
        campaignStatus: true
      }
    });

    return {
      message: 'Campaign approved successfully',
      campaign: updatedCampaign
    };
  }

  /**
   * Manual rejection of a campaign by admin
   * Only allowed from "Pending" status
   */
  async rejectCampaign(campaignId: number) {
    // Get the campaign with current status
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        campaignStatus: true
      }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Only allow rejection from "Pending" status
    if (campaign.campaignStatus.name !== 'Pending') {
      throw new Error(`Cannot reject campaign with status: ${campaign.campaignStatus.name}. Only campaigns with "Pending" status can be rejected.`);
    }

    const rejectedStatus = await prisma.campaignStatus.findUnique({
      where: { name: 'Rejected' }
    });

    if (!rejectedStatus) {
      throw new Error('Rejected status not found in database');
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { campaignStatusId: rejectedStatus.id },
      include: {
        campaignStatus: true
      }
    });

    return {
      message: 'Campaign rejected successfully',
      campaign: updatedCampaign
    };
  }

  /**
   * Automatically cancel expired campaigns that have no votes
   * This method finds campaigns that are expired (endDate < now) and have no votes
   * and sets them to "Cancelled" status
   */
  async cancelExpiredCampaignsWithNoVotes() {
    const now = new Date().toISOString();
    
    // Find campaigns that are expired and have no votes
    // Only cancel campaigns that are in "Pending" status and past their end date
    const expiredCampaignsWithNoVotes = await prisma.campaign.findMany({
      where: {
        endDate: {
          lt: now
        },
        campaignStatus: {
          name: 'Pending'
        },
        votes: {
          none: {} // No votes exist for this campaign
        }
      },
      include: {
        campaignStatus: true,
        _count: {
          select: {
            votes: true
          }
        }
      }
    });

    if (expiredCampaignsWithNoVotes.length === 0) {
      this.logger.log('No expired campaigns with no votes found to cancel');
      return {
        message: 'No expired campaigns with no votes found to cancel',
        cancelledCount: 0,
        campaigns: []
      };
    }

    this.logger.log(`Found ${expiredCampaignsWithNoVotes.length} expired campaigns with no votes to cancel`);

    // Get the "Cancelled" status ID
    const cancelledStatus = await prisma.campaignStatus.findUnique({
      where: { name: 'Cancelled' }
    });

    if (!cancelledStatus) {
      throw new Error('Cancelled status not found in database');
    }

    // Update campaigns to "Cancelled"
    const updatePromises = expiredCampaignsWithNoVotes.map(async (campaign) => {
      this.logger.log(`Cancelling campaign ${campaign.id} (${campaign.name}) - expired on ${campaign.endDate} with 0 votes`);
      
      const updatedCampaign = await prisma.campaign.update({
        where: { id: campaign.id },
        data: { campaignStatusId: cancelledStatus.id },
        include: {
          campaignStatus: true
        }
      });
      
      return updatedCampaign;
    });

    const updatedCampaigns = await Promise.all(updatePromises);

    this.logger.log(`Successfully cancelled ${updatedCampaigns.length} expired campaigns with no votes`);

    return {
      message: `Cancelled ${updatedCampaigns.length} expired campaigns with no votes`,
      cancelledCount: updatedCampaigns.length,
      campaigns: updatedCampaigns
    };
  }

  /**
   * Cancel a campaign by admin
   * Allowed from "Created" and "Active" status only
   */
  async cancelCampaign(campaignId: number) {
    // Get the campaign with current status
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        campaignStatus: true
      }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Only allow cancellation from "Created" and "Active" status
    const allowedStatuses = ['Created', 'Active'];
    if (!allowedStatuses.includes(campaign.campaignStatus.name)) {
      throw new Error(`Cannot cancel campaign with status: ${campaign.campaignStatus.name}. Only campaigns with "Created" or "Active" status can be cancelled.`);
    }

    const cancelledStatus = await prisma.campaignStatus.findUnique({
      where: { name: 'Cancelled' }
    });

    if (!cancelledStatus) {
      throw new Error('Cancelled status not found in database');
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { campaignStatusId: cancelledStatus.id },
      include: {
        campaignStatus: true
      }
    });

    return {
      message: 'Campaign cancelled successfully',
      campaign: updatedCampaign
    };
  }

  /**
   * Handle status update actions (called by Lambda or direct API)
   * This method processes the current campaign status and triggers appropriate actions
   */
  async handleStatusUpdate(campaignId: number) {
    try {
      console.log(`🔄 Processing status update for campaign ${campaignId}`);
      
      // Get current campaign status from database
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          campaignStatus: true
        }
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      console.log(`📊 Campaign ${campaignId} current status: ${campaign.campaignStatus.name}`);

      // Handle different statuses using status ID for better maintainability
      switch (campaign.campaignStatus.id) {
        case 2: // Active
          console.log('🟢 Campaign activated - sending emails...');
          await this.emailService.sendEmailsByCampaign(campaignId);
          break;
          
        case 5: // Approved
          console.log('🚀 Campaign approved - pushing votes to Hedera...');
          await this.voteService.pushVotesToHedera(campaignId);
          break;
          
        case 3: // Pending
          console.log('⏳ Campaign pending - no action needed');
          break;
          
        case 4: // Rejected
          console.log('❌ Campaign rejected - no action needed');
          break;
          
        case 6: // Cancelled
          console.log('🚫 Campaign cancelled - no action needed');
          break;
          
        case 1: // Created
          console.log('📝 Campaign created - no action needed');
          break;
          
        default:
          console.log(`ℹ️ Status ${campaign.campaignStatus.name} (ID: ${campaign.campaignStatus.id}) - no specific action`);
      }

      return {
        success: true,
        message: `Status update processed: ${campaign.campaignStatus.name}`,
        campaignId: campaignId,
        status: campaign.campaignStatus.name
      };
      
    } catch (error) {
      console.error('❌ Error processing status update:', error);
      throw new Error(`Failed to process status update: ${error.message}`);
    }
  }

  /**
   * Perform nightly campaign state corrections
   * This method handles all nightly maintenance tasks
   */
  async performNightlyCorrection() {
    const startTime = new Date();
    console.log('🌙 Starting nightly campaign state correction...');

    try {
      // 1. Fix missing blockchain data (approved campaigns without tx_hash)
      console.log('🔗 Checking for approved campaigns without tx_hash...');
      const blockchainResult = await this.fixMissingBlockchainData();

      // 2. Fix campaign status transitions
      console.log('⏰ Running campaign status transitions...');
      const statusResult = await this.updateAllCampaignStatuses();

      // Calculate summary
      const endTime = new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;

      const summary = {
        timestamp: new Date().toISOString(),
        duration_seconds: duration,
        blockchain_corrections: blockchainResult,
        status_transitions: {
          total_updated: statusResult.totalUpdated,
          activated: statusResult.activateResult.activatedCount,
          pending: statusResult.pendingResult.pendingCount,
          cancelled: statusResult.cancelExpiredResult.cancelledCount,
          success: true
        },
        total_corrections: blockchainResult.fixed + statusResult.totalUpdated,
        total_failures: blockchainResult.failed
      };

      console.log('📊 Nightly correction summary:', JSON.stringify(summary, null, 2));

      return summary;

    } catch (error) {
      console.error('❌ Nightly correction failed:', error);
      throw new Error(`Nightly correction failed: ${error.message}`);
    }
  }

  /**
   * Fix approved campaigns without tx_hash by pushing to Hedera
   * Handles cases where some votes were pushed, none were pushed, or all were pushed but Merkle tree wasn't generated
   */
  private async fixMissingBlockchainData() {
    try {
      // Reset any campaigns stuck mid-push (service crashed while 'PUSHING' lock was held)
      const stuckReset = await prisma.campaign.updateMany({
        where: { campaignStatus: { name: 'Approved' }, tx_hash: 'PUSHING' },
        data: { tx_hash: null },
      });
      if (stuckReset.count > 0) {
        console.log(`🔓 Reset ${stuckReset.count} campaign(s) stuck in PUSHING state`);
      }

      // Get approved campaigns without tx_hash
      const campaignsWithoutTxHash = await prisma.campaign.findMany({
        where: {
          campaignStatus: {
            name: 'Approved'
          },
          tx_hash: null
        },
        include: {
          votes: true // Get all votes to analyze the situation
        }
      });

      console.log(`Found ${campaignsWithoutTxHash.length} approved campaigns without tx_hash`);

      let fixedCount = 0;
      let failedCount = 0;
      let merkleGeneratedCount = 0;

      for (const campaign of campaignsWithoutTxHash) {
        try {
          console.log(`🔄 Analyzing campaign ${campaign.id} for blockchain data fixes...`);
          
          const totalVotes = campaign.votes.length;
          const votesWithHash = campaign.votes.filter(vote => vote.vote_hash !== null).length;
          const votesWithoutHash = totalVotes - votesWithHash;

          console.log(`📊 Campaign ${campaign.id}: ${totalVotes} total votes, ${votesWithHash} with hash, ${votesWithoutHash} without hash`);

          if (totalVotes === 0) {
            console.log(`⏭️ Campaign ${campaign.id} has no votes - skipping`);
            continue;
          }

          if (votesWithHash === 0) {
            // Case 1: No votes pushed to Hedera at all
            console.log(`🚀 Campaign ${campaign.id}: No votes pushed to Hedera - pushing all votes...`);
            const result = await this.voteService.pushVotesToHedera(campaign.id);
            
            if (result.merkleGenerated) {
              fixedCount++;
              merkleGeneratedCount++;
              console.log(`✅ Campaign ${campaign.id}: All votes pushed and Merkle tree generated`);
            } else {
              console.log(`⚠️ Campaign ${campaign.id}: Some votes failed to push - will retry next time`);
              failedCount++;
            }

          } else if (votesWithHash > 0 && votesWithoutHash > 0) {
            // Case 2: Some votes pushed, some not pushed
            console.log(`🔄 Campaign ${campaign.id}: Partial votes pushed (${votesWithHash}/${totalVotes}) - retrying all votes...`);
            
            // Clear all vote hashes to retry from scratch
            await prisma.vote.updateMany({
              where: { campaignId: campaign.id },
              data: { vote_hash: null }
            });
            
            console.log(`🔄 Campaign ${campaign.id}: Cleared vote hashes, retrying push...`);
            const result = await this.voteService.pushVotesToHedera(campaign.id);
            
            if (result.merkleGenerated) {
              fixedCount++;
              merkleGeneratedCount++;
              console.log(`✅ Campaign ${campaign.id}: All votes pushed and Merkle tree generated`);
            } else {
              console.log(`⚠️ Campaign ${campaign.id}: Some votes still failed - will retry next time`);
              failedCount++;
            }

          } else if (votesWithHash === totalVotes) {
            // Case 3: All votes pushed but Merkle tree not generated
            console.log(`🌳 Campaign ${campaign.id}: All votes pushed but no Merkle tree - generating...`);
            
            // Get votes with hashes for Merkle tree generation
            const votesWithHashes = await prisma.vote.findMany({
              where: {
                campaignId: campaign.id,
                vote_hash: { not: null }
              },
              include: {
                user: {
                  select: {
                    id: true,
                    business_email: true,
                    first_name: true,
                    last_name: true
                  }
                },
                project: {
                  select: {
                    id: true,
                    projectName: true
                  }
                }
              },
              orderBy: { id: 'asc' }
            });

            if (votesWithHashes.length === totalVotes) {
              // Generate Merkle tree
              const { MerkleTreeUtil } = await import('../utils/merkle-tree.util');
              const campaignTxData = MerkleTreeUtil.generateCampaignTransactionDataFromHederaHashes(
                campaign.id,
                votesWithHashes
              );

              // Update campaign with Merkle root
              await prisma.campaign.update({
                where: { id: campaign.id },
                data: { tx_hash: campaignTxData.merkleRoot }
              });

              fixedCount++;
              merkleGeneratedCount++;
              console.log(`✅ Campaign ${campaign.id}: Merkle tree generated and stored`);
            } else {
              console.log(`⚠️ Campaign ${campaign.id}: Vote count mismatch - will retry next time`);
              failedCount++;
            }
          }

        } catch (error) {
          console.error(`❌ Failed to fix campaign ${campaign.id}:`, error);
          failedCount++;
        }
      }

      return {
        total: campaignsWithoutTxHash.length,
        fixed: fixedCount,
        failed: failedCount,
        merkle_generated: merkleGeneratedCount,
        details: {
          campaigns_processed: campaignsWithoutTxHash.length,
          campaigns_fixed: fixedCount,
          campaigns_failed: failedCount,
          merkle_trees_generated: merkleGeneratedCount
        }
      };

    } catch (error) {
      console.error('❌ Error fixing missing blockchain data:', error);
      return {
        total: 0,
        fixed: 0,
        failed: 1,
        merkle_generated: 0,
        details: {
          error: error.message
        }
      };
    }
  }

} 