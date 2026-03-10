import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { MerkleTreeUtil, CampaignTransactionData } from '../utils/merkle-tree.util';

const prisma = new PrismaClient();

@Injectable()
export class VoteService {
  
  /**
   * Create a vote for a user on a specific project in a campaign
   */
  async createVote(data: {
    userId: number;
    campaignId: number;
    projectId: number;
    reason?: string;
  }) {
    // Check if campaign exists and is active
    const campaign = await prisma.campaign.findUnique({
      where: { id: data.campaignId },
      include: { campaignStatus: true }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.campaignStatus.name !== 'Active') {
      throw new BadRequestException('Voting is only allowed for active campaigns');
    }

    // Check if project belongs to the campaign
    const campaignProject = await prisma.campaignProject.findUnique({
      where: {
        campaignId_projectId: {
          campaignId: data.campaignId,
          projectId: data.projectId
        }
      }
    });

    if (!campaignProject) {
      throw new BadRequestException('Project does not belong to this campaign');
    }

    // Check if user has already voted on this campaign
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_campaignId: {
          userId: data.userId,
          campaignId: data.campaignId
        }
      }
    });

    if (existingVote) {
      throw new BadRequestException('User has already voted on this campaign');
    }

    // Get user information including department ID and role
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { 
        departmentId: true,
        first_name: true,
        last_name: true,
        business_email: true,
        role_id: true
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has Employee role
    const employeeRole = await prisma.role.findUnique({
      where: { name: 'Employee' },
      select: { id: true }
    });

    if (!employeeRole) {
      throw new Error('Employee role not found in database');
    }

    if (user.role_id !== employeeRole.id) {
      // Get role name from database
      const userRole = await prisma.role.findUnique({
        where: { id: user.role_id },
        select: { name: true }
      });
      
      const currentRole = userRole?.name || 'Unknown';
      throw new BadRequestException(`Only employees can vote. Current role (${currentRole}) is not allowed to vote.`);
    }

    // Create the vote
    const vote = await prisma.vote.create({
      data: {
        userId: data.userId,
        campaignId: data.campaignId,
        projectId: data.projectId,
        voteData: {
          reason: data.reason || null,
          departmentId: user.departmentId
        }
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
        },
        campaign: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return vote;
  }

  /**
   * Get all votes for a specific campaign (admin endpoint)
   */
  async getVotesByCampaign(campaignId: number) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        tx_hash: true
      }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const votes = await prisma.vote.findMany({
      where: { campaignId },
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
      orderBy: { createdAt: 'desc' }
    });

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        tx_hash: campaign.tx_hash
      },
      totalVotes: votes.length,
      votes: votes
    };
  }

  /**
   * Push all votes for a campaign to Hedera when campaign is approved
   */
  async pushVotesToHedera(campaignId: number) {
    // Atomic claim: only the first concurrent caller proceeds.
    // Uses a single UPDATE ... WHERE tx_hash IS NULL as an optimistic lock.
    // This prevents duplicate blockchain submissions when Lambda retries or two
    // callers race (e.g. status handler + Lambda firing simultaneously).
    const claim = await prisma.campaign.updateMany({
      where: { id: campaignId, tx_hash: null },
      data: { tx_hash: 'PUSHING' },
    });

    if (claim.count === 0) {
      const current = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { tx_hash: true },
      });
      if (!current) throw new Error('Campaign not found');
      if (current.tx_hash === 'PUSHING') {
        console.log(`⏳ Campaign ${campaignId} push already in progress — skipping`);
        return { message: 'Push already in progress', pushedCount: 0, skipped: true };
      }
      console.log(`⚠️ Campaign ${campaignId} already pushed (tx_hash: ${current.tx_hash}) — skipping`);
      return { message: 'Votes already pushed to Hedera', pushedCount: 0, skipped: true, existingTxHash: current.tx_hash };
    }

    console.log(`🚀 Campaign ${campaignId} claimed for Hedera push`);

    try {
      // Fetch createdAt for the versioned campaign identifier
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { createdAt: true },
      });
      if (!campaign) throw new Error('Campaign not found');

      // Get all votes for the campaign
      const votes = await prisma.vote.findMany({
        where: { campaignId },
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
        }
      });

      if (votes.length === 0) {
        console.log(`ℹ️ No votes found for campaign ${campaignId}`);
        return { message: 'No votes to push to Hedera', pushedCount: 0 };
      }

      console.log(`📊 Found ${votes.length} votes to push to Hedera`);

      // Load contract deployment info
      const deploymentPath = path.join(process.cwd(), 'src/contracts/VotingStorageDeployment.json');
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      
      // Initialize Hedera provider
      const provider = new ethers.JsonRpcProvider(process.env.HEDERA_TESTNET_RPC_URL);
      
      // Create wallet from private key (remove 0x prefix if present)
      const privateKey = process.env.PRIVATE_KEY_HEDERA?.startsWith('0x') 
        ? process.env.PRIVATE_KEY_HEDERA.slice(2) 
        : process.env.PRIVATE_KEY_HEDERA;
      
      const wallet = new ethers.Wallet(`0x${privateKey}`, provider);
      
      // Create contract instance
      const contract = new ethers.Contract(
        deploymentData.address,
        deploymentData.abi,
        wallet
      );

      let successCount = 0;
      const failedVotes = [];

      // Pre-fetch on-chain votes once to detect already-submitted votes
      const campaignVersion = campaign.createdAt.getTime().toString();
      const campaignIdentifier = `${campaignId}_${campaignVersion}`;

      let onChainEmails: string[] = [];
      try {
        const onChainCount = Number(await contract.getVoteCount(campaignIdentifier));
        if (onChainCount > 0) {
          const onChainVotes = await contract.getVotesForCampaign(campaignIdentifier, 0, onChainCount);
          onChainEmails = onChainVotes.emails.map((e: string) => e.toLowerCase());
          console.log(`📋 Found ${onChainCount} existing votes on-chain for campaign identifier ${campaignIdentifier}`);
        }
      } catch (e) {
        console.warn(`⚠️ Could not pre-fetch on-chain votes: ${e.message}`);
      }

      // Push each vote to Hedera
      for (const vote of votes) {
        try {
          // Skip votes that already have a vote_hash in DB
          if (vote.vote_hash) {
            console.log(`⏭️ Vote ${vote.id} already has vote_hash: ${vote.vote_hash} - skipping`);
            continue;
          }

          // Check if vote already exists on-chain (DB was not updated after a previous push)
          const emailLower = (vote.user.business_email || '').toLowerCase();
          if (onChainEmails.includes(emailLower)) {
            console.log(`⚠️ Vote ${vote.id} (${vote.user.business_email}) already exists on-chain — DB not updated. Recovering...`);
            await prisma.vote.update({
              where: { id: vote.id },
              data: { vote_hash: 'RECOVERED_ALREADY_ON_CHAIN' }
            });
            successCount++;
            continue;
          }

          // Extract vote data
          const voteData = vote.voteData as any;
          const reason = voteData?.reason || '';
          const departmentId = voteData?.departmentId || null;

          // Create additional data JSON
          const additionalData = JSON.stringify({
            reason,
            departmentId,
            projectId: vote.projectId,
            projectName: vote.project.projectName,
            userId: vote.userId,
            userName: `${vote.user.first_name} ${vote.user.last_name}`.trim(),
            voteId: vote.id,
            createdAt: vote.createdAt.toISOString()
          });

          // Cast vote on Hedera (always vote in favor = 1 for now)
          const tx = await contract.castVote(
            campaignIdentifier,
            1, // voteOption: 1 = in favor
            vote.user.business_email || '',
            ethers.ZeroAddress,
            additionalData
          );

          // Wait for transaction confirmation
          const receipt = await tx.wait();

          console.log(`✅ Vote ${vote.id} pushed to Hedera. TX Hash: ${receipt.hash}`);

          // Update vote with Hedera transaction hash
          await prisma.vote.update({
            where: { id: vote.id },
            data: { vote_hash: receipt.hash }
          });

          successCount++;

        } catch (error) {
          // NONCE_EXPIRED means a previous tx for this vote already landed on-chain
          // but the DB update never happened. Recover by checking on-chain state.
          if (error.code === 'NONCE_EXPIRED' || (error.message && error.message.includes('nonce has already been used'))) {
            console.log(`⚠️ Vote ${vote.id} NONCE_EXPIRED — transaction was already submitted. Attempting on-chain recovery...`);
            try {
              const onChainCount = Number(await contract.getVoteCount(campaignIdentifier));
              if (onChainCount > 0) {
                const onChainVotes = await contract.getVotesForCampaign(campaignIdentifier, 0, onChainCount);
                const emailLower = (vote.user.business_email || '').toLowerCase();
                const matchIndex = onChainVotes.emails.findIndex(
                  (e: string) => e.toLowerCase() === emailLower
                );
                if (matchIndex >= 0) {
                  console.log(`✅ Vote ${vote.id} confirmed on-chain at index ${matchIndex}. Updating DB.`);
                  await prisma.vote.update({
                    where: { id: vote.id },
                    data: { vote_hash: 'RECOVERED_NONCE_EXPIRED' }
                  });
                  successCount++;
                  continue;
                }
              }
              console.error(`❌ Could not confirm vote ${vote.id} on-chain after NONCE_EXPIRED.`);
            } catch (recoveryError) {
              console.error(`❌ Recovery query failed for vote ${vote.id}:`, recoveryError.message);
            }
          }
          console.error(`❌ Failed to push vote ${vote.id} to Hedera:`, error.shortMessage || error.message);
          failedVotes.push({
            voteId: vote.id,
            error: error.shortMessage || error.message
          });
        }
      }

      // Generate Merkle tree and campaign transaction data ONLY if ALL votes were pushed successfully
      if (successCount > 0 && failedVotes.length === 0) {
        console.log('🌳 All votes pushed successfully - generating Merkle tree...');
        
        // Get all votes for Merkle tree generation (all should have vote_hash now)
        const refreshedVotes = await prisma.vote.findMany({
          where: { 
            campaignId,
            vote_hash: { not: null } // Only votes that were successfully pushed
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

        if (refreshedVotes.length !== votes.length) {
          console.log(`⚠️ Not all votes have vote_hash. Expected: ${votes.length}, Found: ${refreshedVotes.length}`);
          console.log(`🔄 Skipping Merkle tree generation - will be handled by nightly correction`);
          return {
            message: 'Some votes failed to push to Hedera',
            pushedCount: successCount,
            failedCount: failedVotes.length,
            failedVotes,
            merkleGenerated: false
          };
        }

        // Generate campaign transaction data with Merkle root using Hedera transaction hashes
        const campaignTxData: CampaignTransactionData = MerkleTreeUtil.generateCampaignTransactionDataFromHederaHashes(
          campaignId,
          refreshedVotes
        );

        console.log(`🌳 Merkle Root: ${campaignTxData.merkleRoot}`);
        console.log(`📊 Total Votes in Tree: ${campaignTxData.totalVotes}`);

        // We hold the 'PUSHING' lock — safe to update directly, no double-check needed
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { tx_hash: campaignTxData.merkleRoot },
        });

        console.log(`✅ Campaign updated with Merkle root transaction hash`);

        return {
          message: 'All votes pushed to Hedera and Merkle tree generated',
          pushedCount: successCount,
          failedCount: 0,
          merkleGenerated: true,
          merkleRoot: campaignTxData.merkleRoot
        };
      } else if (successCount > 0 && failedVotes.length > 0) {
        console.log(`⚠️ Some votes failed to push. Success: ${successCount}, Failed: ${failedVotes.length}`);
        // Release lock so nightly correction can retry
        await prisma.campaign.updateMany({ where: { id: campaignId, tx_hash: 'PUSHING' }, data: { tx_hash: null } });
        return {
          message: 'Some votes failed to push to Hedera',
          pushedCount: successCount,
          failedCount: failedVotes.length,
          failedVotes,
          merkleGenerated: false
        };
      } else {
        console.log(`❌ All votes failed to push to Hedera`);
        // Release lock so nightly correction can retry
        await prisma.campaign.updateMany({ where: { id: campaignId, tx_hash: 'PUSHING' }, data: { tx_hash: null } });
        return {
          message: 'All votes failed to push to Hedera',
          pushedCount: 0,
          failedCount: failedVotes.length,
          failedVotes,
          merkleGenerated: false
        };
      }

    } catch (error) {
      // Release lock on unexpected error so nightly correction can retry
      await prisma.campaign.updateMany({ where: { id: campaignId, tx_hash: 'PUSHING' }, data: { tx_hash: null } }).catch(() => {});
      console.error('❌ Error pushing votes to Hedera:', error);
      throw new Error(`Failed to push votes to Hedera: ${error.message}`);
    }
  }

  /**
   * Generate proof for all votes in a campaign (or specific votes if voteIds provided)
   */
  async generateVoteProof(campaignId: number, selectedVoteIds?: number[]) {
    try {
      console.log(`🔍 Generating proof for campaign ${campaignId}`);

      // Get campaign to verify it exists and has tx_hash
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, name: true, tx_hash: true }
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (!campaign.tx_hash) {
        throw new Error('Campaign has not been pushed to Hedera yet');
      }

      // Get all votes for the campaign
      const votes = await prisma.vote.findMany({
        where: { campaignId },
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

      if (votes.length === 0) {
        throw new Error('No votes found for this campaign');
      }

      // Generate campaign transaction data (on-demand)
      const campaignTxData: CampaignTransactionData = MerkleTreeUtil.generateCampaignTransactionDataFromHederaHashes(
        campaignId,
        votes
      );

      // Verify the generated root matches the stored root
      if (campaignTxData.merkleRoot !== campaign.tx_hash) {
        console.warn(`⚠️ Generated root (${campaignTxData.merkleRoot}) doesn't match stored root (${campaign.tx_hash})`);
        // This could happen if votes were added after the campaign was pushed to Hedera
      }

      // Determine which vote IDs to generate proofs for
      const voteIdsToProcess = selectedVoteIds || votes.map(vote => vote.id);
      const filteredVotes = selectedVoteIds 
        ? votes.filter(vote => selectedVoteIds.includes(vote.id))
        : votes;

      // Generate proof for selected votes
      const proofData = MerkleTreeUtil.createVoteProof(
        campaignTxData,
        voteIdsToProcess,
        votes
      );

      console.log(`✅ Generated proof for ${voteIdsToProcess.length} votes`);

      return {
        campaignId: campaignId,
        campaignName: campaign.name,
        merkleRoot: campaign.tx_hash,
        totalVotes: votes.length,
        voteIds: voteIdsToProcess,
        voteHashes: proofData.selectedVoteHashes,
        inclusionProofs: proofData.inclusionProofs,
        verificationData: proofData.verificationData,
        votes: votes.map(vote => ({
          id: vote.id,
          userId: vote.userId,
          userEmail: vote.user.business_email,
          userName: `${vote.user.first_name} ${vote.user.last_name}`,
          projectId: vote.projectId,
          projectName: vote.project.projectName,
          voteHash: vote.vote_hash,
          createdAt: vote.createdAt
        })),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error generating vote proof:', error);
      throw new Error(`Failed to generate vote proof: ${error.message}`);
    }
  }



  /**
   * Pull all votes for a campaign from Hedera
   */
  async pullVotesFromHedera(campaignId: number) {
    try {
      console.log(`📥 Pulling votes from Hedera for campaign ${campaignId}`);
      
      // Get campaign to create versioned identifier
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { createdAt: true }
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Create versioned campaign identifier (same as used when pushing)
      const campaignVersion = campaign.createdAt.getTime().toString();
      const campaignIdentifier = `${campaignId}_${campaignVersion}`;
      
      // Load contract deployment info
      const deploymentPath = path.join(process.cwd(), 'src/contracts/VotingStorageDeployment.json');
      const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      
      // Initialize Hedera provider (read-only)
      const provider = new ethers.JsonRpcProvider(process.env.HEDERA_TESTNET_RPC_URL);
      
      // Create contract instance (read-only)
      const contract = new ethers.Contract(
        deploymentData.address,
        deploymentData.abi,
        provider
      );

      // Get vote count for the campaign using versioned identifier
      console.log(`🔗 Calling Hedera contract: ${deploymentData.address}`);
      console.log(`🎯 Using campaign identifier: ${campaignIdentifier}`);
      const voteCount = await contract.getVoteCount(campaignIdentifier);
      console.log(`📊 Found ${voteCount} votes on Hedera for campaign ${campaignId} (version: ${campaignVersion})`);
      console.log(`🌐 Hedera RPC URL: ${process.env.HEDERA_TESTNET_RPC_URL}`);

      if (voteCount === 0) {
        return { message: 'No votes found on Hedera', votes: [] };
      }

      // Get all votes for the campaign (with pagination if needed)
      const votes = await contract.getVotesForCampaign(campaignIdentifier, 0, voteCount);
      
      // Parse the votes
      const parsedVotes = [];
      for (let i = 0; i < votes.voteOptions.length; i++) {
        try {
          const additionalData = JSON.parse(votes.additionalData[i]);
          parsedVotes.push({
            voteOption: parseInt(votes.voteOptions[i]) === 1 ? 'In Favor' : 'Against',
            email: votes.emails[i],
            voterAddress: votes.voters[i],
            additionalData: additionalData,
            reason: additionalData.reason || '',
            departmentId: additionalData.departmentId || null,
            projectId: additionalData.projectId || null,
            projectName: additionalData.projectName || '',
            userId: additionalData.userId || null,
            userName: additionalData.userName || '',
            voteId: additionalData.voteId || null,
            createdAt: additionalData.createdAt || null
          });
        } catch (error) {
          console.error(`❌ Error parsing vote ${i}:`, error);
          parsedVotes.push({
            voteOption: parseInt(votes.voteOptions[i]) === 1 ? 'In Favor' : 'Against',
            email: votes.emails[i],
            voterAddress: votes.voters[i],
            additionalData: votes.additionalData[i],
            reason: 'Error parsing data',
            departmentId: null,
            projectId: null,
            projectName: '',
            userId: null,
            userName: '',
            voteId: null,
            createdAt: null
          });
        }
      }

      // Deduplicate by email — keep first occurrence (blockchain may have duplicates from retries)
      const seenEmails = new Set<string>();
      const dedupedVotes = parsedVotes.filter(v => {
        const key = (v.email || '').toLowerCase();
        if (seenEmails.has(key)) return false;
        seenEmails.add(key);
        return true;
      });

      if (dedupedVotes.length !== parsedVotes.length) {
        console.log(`🔁 Deduplicated ${parsedVotes.length} → ${dedupedVotes.length} votes (removed ${parsedVotes.length - dedupedVotes.length} duplicates)`);
      }

      console.log(`✅ Successfully pulled ${dedupedVotes.length} votes from Hedera`);

      return {
        message: 'Votes pulled from Hedera successfully',
        voteCount: dedupedVotes.length,
        votes: dedupedVotes
      };

    } catch (error) {
      console.error('❌ Error pulling votes from Hedera:', error);
      throw new Error(`Failed to pull votes from Hedera: ${error.message}`);
    }
  }


} 