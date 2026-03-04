import { Controller, Post, Get, Body, Param, Res, HttpStatus, Query } from '@nestjs/common';
import { VoteService } from './vote.service';
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('vote')
export class VoteController {
  constructor(private readonly voteService: VoteService) {}



  /**
   * POST /vote - Create a vote for a user
   */
  @Post()
  async createVote(
    @Body() body: {
      userId: number;
      campaignId: number;
      projectId: number;
      reason?: string;
    },
    @Res() res: Response
  ) {
    try {
      // Validation
      if (!body.userId || !body.campaignId || !body.projectId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'userId, campaignId, and projectId are required',
        });
      }

      const vote = await this.voteService.createVote(body);

      return res.status(HttpStatus.CREATED).json({
        statusCode: 201,
        message: 'Vote created successfully',
        data: vote,
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: error.message,
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  /**
   * GET /vote/campaign-votes/:campaignId - Get all votes for a campaign (admin only)
   */
  @Get('campaign-votes/:campaignId')
  async getVotesByCampaign(
    @Param('campaignId') campaignId: string,
    @Query('userId') userId: string, // User ID from query parameter
    @Res() res: Response
  ) {
    try {
      console.log('🔍 Debug - Received parameters:', {
        campaignId,
        userId,
        userIdType: typeof userId
      });
      
      // Check if user is admin
      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          statusCode: 401,
          message: 'User ID is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId, 10) },
        include: { role: true }
      });

      if (!user || user.role_id !== 1) {
        return res.status(HttpStatus.FORBIDDEN).json({
          statusCode: 403,
          message: 'Access denied. Admin role required.',
        });
      }

      const campaignIdNum = parseInt(campaignId, 10);
      
      if (isNaN(campaignIdNum)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Invalid campaign ID',
        });
      }

      const result = await this.voteService.getVotesByCampaign(campaignIdNum);

      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Votes retrieved successfully',
        data: result,
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: 404,
          message: error.message,
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  /**
   * GET /vote/hedera/:campaignId - Get all votes for a campaign from Hedera (admin only)
   */
  @Get('hedera/:campaignId')
  async getVotesFromHedera(
    @Param('campaignId') campaignId: string,
    @Query('userId') userId: string, // User ID from query parameter
    @Res() res: Response
  ) {
    try {
      console.log('🔍 Debug - Hedera votes request:', {
        campaignId,
        userId,
        userIdType: typeof userId
      });

      // Check if user is admin
      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          statusCode: 401,
          message: 'User ID is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId, 10) },
        include: { role: true }
      });

      if (!user || user.role_id !== 1) {
        return res.status(HttpStatus.FORBIDDEN).json({
          statusCode: 403,
          message: 'Access denied. Admin role required.',
        });
      }

      const campaignIdNum = parseInt(campaignId, 10);
      
      if (isNaN(campaignIdNum)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Invalid campaign ID',
        });
      }

      const result = await this.voteService.pullVotesFromHedera(campaignIdNum);

      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Votes retrieved from Hedera successfully',
        data: result,
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: 404,
          message: error.message,
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  /**
   * GET /vote/proof/:campaignId - Generate proof for all votes in campaign (or specific votes if voteIds provided)
   */
  @Get('proof/:campaignId')
  async generateVoteProof(
    @Param('campaignId') campaignId: string,
    @Query('userId') userId: string, // Admin user ID
    @Query('voteIds') voteIds: string | undefined, // Optional: Comma-separated vote IDs
    @Res() res: Response
  ) {
    try {
      // Validate admin access
      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          statusCode: 401,
          message: 'User ID is required',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId, 10) },
        include: { role: true }
      });

      if (!user || user.role_id !== 1) {
        return res.status(HttpStatus.FORBIDDEN).json({
          statusCode: 403,
          message: 'Access denied. Admin role required.',
        });
      }

      // Parse campaign ID
      const campaignIdNum = parseInt(campaignId, 10);
      if (isNaN(campaignIdNum)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Invalid campaign ID',
        });
      }

      // Parse vote IDs if provided
      let selectedVoteIds: number[] | undefined;
      if (voteIds) {
        selectedVoteIds = voteIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
        if (selectedVoteIds.length === 0) {
          return res.status(HttpStatus.BAD_REQUEST).json({
            statusCode: 400,
            message: 'No valid vote IDs provided',
          });
        }
      }

      const result = await this.voteService.generateVoteProof(campaignIdNum, selectedVoteIds);

      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Vote proof generated successfully',
        data: result,
      });
    } catch (error) {
      console.error('❌ Error generating vote proof:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Failed to generate proof',
        error: error.message,
      });
    }
  }



  /**
   * POST /vote/verify-proof - Verify a vote proof
   */
  @Post('verify-proof')
  async verifyVoteProof(
    @Body() body: {
      proof: any;
      merkleRoot: string;
    },
    @Res() res: Response
  ) {
    try {
      if (!body.proof || !body.merkleRoot) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Proof and Merkle root are required',
        });
      }

      const { MerkleTreeUtil } = await import('../utils/merkle-tree.util');
      const isValid = MerkleTreeUtil.verifyProof(body.proof, body.merkleRoot);

      return res.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'Proof verification completed',
        isValid: isValid,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error verifying proof:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Failed to verify proof',
        error: error.message,
      });
    }
  }

  /**
   * POST /vote/hedera/:campaignId - Push votes to Hedera (for Lambda corrections)
   */
  @Post('hedera/:campaignId')
  async pushVotesToHedera(
    @Param('campaignId') campaignId: string,
    @Res() res: Response
  ) {
    try {
      console.log('🚀 Pushing votes to Hedera for campaign:', campaignId);

      const campaignIdNum = parseInt(campaignId, 10);
      
      if (isNaN(campaignIdNum)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: 400,
          message: 'Invalid campaign ID',
        });
      }

      const result = await this.voteService.pushVotesToHedera(campaignIdNum);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Votes pushed to Hedera successfully',
        data: result,
      });
    } catch (error) {
      console.error('❌ Error pushing votes to Hedera:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Failed to push votes to Hedera',
        error: error.message,
      });
    }
  }

} 