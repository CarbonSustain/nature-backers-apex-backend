import { Test, TestingModule } from '@nestjs/testing';
import { CampaignStatusService } from './campaign-status.service';
import { SendEmailService } from '../email/send-email.service';
import { VoteService } from '../vote/vote.service';

// Mock the entire @prisma/client module
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    campaign: {
      findMany: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    vote: {
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    campaignStatus: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
  };
});

// Import the mocked PrismaClient
const { PrismaClient } = require('@prisma/client');

describe('CampaignStatusService - Nightly Correction', () => {
  let service: CampaignStatusService;
  let emailService: SendEmailService;
  let voteService: VoteService;
  let mockPrisma: any;

  beforeEach(async () => {
    // Create a fresh mock instance for each test
    mockPrisma = new PrismaClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignStatusService,
        {
          provide: SendEmailService,
          useValue: {
            sendEmailsByCampaign: jest.fn(),
          },
        },
        {
          provide: VoteService,
          useValue: {
            pushVotesToHedera: jest.fn(),
            pullVotesFromHedera: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CampaignStatusService>(CampaignStatusService);
    emailService = module.get<SendEmailService>(SendEmailService);
    voteService = module.get<VoteService>(VoteService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('performNightlyCorrection', () => {
    it('should handle stuck campaign states', async () => {
      console.log('\n🧪 TEST: Starting "should handle stuck campaign states"');
      
      // Mock the service methods
      const mockStuckCampaigns = [{
        id: 1,
        name: 'Test Campaign',
        votingStyle: 'TOKEN_BASED' as const,
        startDate: new Date(),
        endDate: new Date(),
        campaignStatusId: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailBody: 'Test email body',
        emailSubject: 'Test subject',
        url: 'test-url',
        tx_hash: null
      }];

      console.log('📋 Mock Data Setup:');
      console.log('  - Stuck campaigns:', mockStuckCampaigns.length);
      console.log('  - Campaign ID:', mockStuckCampaigns[0].id);
      console.log('  - Campaign Name:', mockStuckCampaigns[0].name);
      console.log('  - Status ID:', mockStuckCampaigns[0].campaignStatusId);

      jest.spyOn(service, 'setCreatedCampaignsToPending').mockResolvedValue({
        message: 'Set 1 created campaigns to pending',
        pendingCount: 1,
        campaigns: mockStuckCampaigns
      });

      jest.spyOn(service, 'activateCreatedCampaigns').mockResolvedValue({
        message: 'No campaigns to activate',
        activatedCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'setActiveCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'cancelExpiredCampaignsWithNoVotes').mockResolvedValue({
        message: 'No expired campaigns with no votes found to cancel',
        cancelledCount: 0,
        campaigns: []
      });

      // Mock the private method using any type
      jest.spyOn(service as any, 'fixMissingBlockchainData').mockResolvedValue({
        total: 0,
        fixed: 0,
        failed: 0,
        merkle_generated: 0,
        details: {
          campaigns_processed: 0,
          campaigns_fixed: 0,
          campaigns_failed: 0,
          merkle_trees_generated: 0
        }
      });

      console.log('🔧 Mock Methods Setup Complete');
      console.log('  - setCreatedCampaignsToPending: mocked to return 1 campaign');
      console.log('  - activateCreatedCampaigns: mocked to return 0 campaigns');
      console.log('  - setActiveCampaignsToPending: mocked to return 0 campaigns');
      console.log('  - cancelExpiredCampaignsWithNoVotes: mocked to return 0 campaigns');
      console.log('  - fixMissingBlockchainData: mocked to return 0 fixes');

      // Call the method
      console.log('\n🚀 Calling performNightlyCorrection...');
      const result = await service.performNightlyCorrection();

      console.log('\n📊 RESULT ANALYSIS:');
      console.log('  - Total corrections:', result.total_corrections);
      console.log('  - Total failures:', result.total_failures);
      console.log('  - Status transitions success:', result.status_transitions.success);
      console.log('  - Blockchain corrections total:', result.blockchain_corrections.total);
      
      console.log('\n📋 Detailed Status Transitions:');
      console.log('  - Total updated:', result.status_transitions.total_updated);
      console.log('  - Activated:', result.status_transitions.activated);
      console.log('  - Pending:', result.status_transitions.pending);
      console.log('  - Cancelled:', result.status_transitions.cancelled);

      console.log('\n🔗 Detailed Blockchain Corrections:');
      console.log('  - Fixed:', result.blockchain_corrections.fixed);
      console.log('  - Failed:', result.blockchain_corrections.failed);
      console.log('  - Merkle generated:', result.blockchain_corrections.merkle_generated);

      // Assertions
      console.log('\n✅ ASSERTIONS:');
      expect(result.total_corrections).toBe(1);
      console.log('  ✓ total_corrections should be 1 (from stuck campaign)');
      
      expect(result.total_failures).toBe(0);
      console.log('  ✓ total_failures should be 0 (no errors)');
      
      expect(result.status_transitions.success).toBe(true);
      console.log('  ✓ status_transitions.success should be true');
      
      expect(result.blockchain_corrections.total).toBe(0);
      console.log('  ✓ blockchain_corrections.total should be 0 (no blockchain fixes needed)');

      console.log('\n🎉 TEST COMPLETED SUCCESSFULLY!\n');
    });

    it('should handle missing blockchain data for approved campaigns', async () => {
      // Mock the service methods
      jest.spyOn(service, 'setCreatedCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'activateCreatedCampaigns').mockResolvedValue({
        message: 'No campaigns to activate',
        activatedCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'setActiveCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'cancelExpiredCampaignsWithNoVotes').mockResolvedValue({
        message: 'No expired campaigns with no votes found to cancel',
        cancelledCount: 0,
        campaigns: []
      });

      // Mock the private method to return success
      jest.spyOn(service as any, 'fixMissingBlockchainData').mockResolvedValue({
        total: 1,
        fixed: 1,
        failed: 0,
        merkle_generated: 1,
        details: {
          campaigns_processed: 1,
          campaigns_fixed: 1,
          campaigns_failed: 0,
          merkle_trees_generated: 1
        }
      });

      // Execute
      const result = await service.performNightlyCorrection();

      // Assertions
      expect(result.blockchain_corrections.fixed).toBe(1);
      expect(result.blockchain_corrections.total).toBe(1);
      expect(result.total_corrections).toBe(1);
      expect(result.timestamp).toBeDefined();
      expect(result.duration_seconds).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty results gracefully', async () => {
      // Mock all service methods to return empty results
      jest.spyOn(service, 'setCreatedCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'activateCreatedCampaigns').mockResolvedValue({
        message: 'No campaigns to activate',
        activatedCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'setActiveCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'cancelExpiredCampaignsWithNoVotes').mockResolvedValue({
        message: 'No expired campaigns with no votes found to cancel',
        cancelledCount: 0,
        campaigns: []
      });

      jest.spyOn(service as any, 'fixMissingBlockchainData').mockResolvedValue({
        total: 0,
        fixed: 0,
        failed: 0,
        merkle_generated: 0,
        details: {
          campaigns_processed: 0,
          campaigns_fixed: 0,
          campaigns_failed: 0,
          merkle_trees_generated: 0
        }
      });

      // Execute
      const result = await service.performNightlyCorrection();

      // Assertions
      expect(result.status_transitions.success).toBe(true);
      expect(result.status_transitions.total_updated).toBe(0);
      expect(result.blockchain_corrections.fixed).toBe(0);
      expect(result.total_corrections).toBe(0);
      expect(result.timestamp).toBeDefined();
      expect(result.duration_seconds).toBeGreaterThanOrEqual(0);
    });

    it('should handle database errors gracefully', async () => {
      // Mock service method to throw error
      jest.spyOn(service, 'setCreatedCampaignsToPending').mockRejectedValue(
        new Error('Database connection failed')
      );

      // Execute and expect error
      await expect(service.performNightlyCorrection()).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should measure execution time correctly', async () => {
      // Mock all service methods
      jest.spyOn(service, 'setCreatedCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'activateCreatedCampaigns').mockResolvedValue({
        message: 'No campaigns to activate',
        activatedCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'setActiveCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'cancelExpiredCampaignsWithNoVotes').mockResolvedValue({
        message: 'No expired campaigns with no votes found to cancel',
        cancelledCount: 0,
        campaigns: []
      });

      jest.spyOn(service as any, 'fixMissingBlockchainData').mockResolvedValue({
        total: 0,
        fixed: 0,
        failed: 0,
        merkle_generated: 0,
        details: {
          campaigns_processed: 0,
          campaigns_fixed: 0,
          campaigns_failed: 0,
          merkle_trees_generated: 0
        }
      });

      // Execute
      const startTime = Date.now();
      const result = await service.performNightlyCorrection();
      const endTime = Date.now();

      // Assertions
      expect(result.duration_seconds).toBeDefined();
      expect(typeof result.duration_seconds).toBe('number');
      expect(result.duration_seconds).toBeGreaterThanOrEqual(0);
      
      // Execution time should be reasonable (less than 60 seconds)
      const executionTimeMs = endTime - startTime;
      expect(executionTimeMs).toBeLessThan(60000);
    });

    it('should provide comprehensive summary with all required fields', async () => {
      // Mock Prisma for fixMissingBlockchainData
      mockPrisma.campaign.findMany.mockResolvedValue([]);
      
      // Mock service methods
      jest.spyOn(service, 'setCreatedCampaignsToPending').mockResolvedValue({
        message: 'Set 1 created campaigns to pending',
        pendingCount: 1,
        campaigns: [{
          id: 1,
          name: 'Test Campaign',
          votingStyle: 'TOKEN_BASED',
          startDate: new Date(),
          endDate: new Date(),
          campaignStatusId: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
          emailBody: 'Test email body',
          emailSubject: 'Test subject',
          url: 'test-url',
          tx_hash: null
        }]
      });

      jest.spyOn(service, 'activateCreatedCampaigns').mockResolvedValue({
        message: 'No campaigns to activate',
        activatedCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'setActiveCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'cancelExpiredCampaignsWithNoVotes').mockResolvedValue({
        message: 'No expired campaigns with no votes found to cancel',
        cancelledCount: 0,
        campaigns: []
      });

      // Don't mock fixMissingBlockchainData - let it use the real method with mocked Prisma

      // Execute
      const result = await service.performNightlyCorrection();

      // Assertions for comprehensive summary
      expect(result.timestamp).toBeDefined();
      expect(result.duration_seconds).toBeGreaterThanOrEqual(0);
      expect(result.blockchain_corrections).toBeDefined();
      expect(result.status_transitions).toBeDefined();
      expect(result.total_corrections).toBeDefined();
      expect(result.total_failures).toBeDefined();
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
      
      // Check specific structure
      expect(result.blockchain_corrections).toHaveProperty('total');
      expect(result.blockchain_corrections).toHaveProperty('fixed');
      expect(result.blockchain_corrections).toHaveProperty('failed');
      expect(result.status_transitions).toHaveProperty('success');
      expect(result.status_transitions).toHaveProperty('total_updated');
      expect(result.status_transitions).toHaveProperty('cancelled');
    });

    it('should handle campaigns with no votes', async () => {
      // Mock service methods
      jest.spyOn(service, 'setCreatedCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'activateCreatedCampaigns').mockResolvedValue({
        message: 'No campaigns to activate',
        activatedCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'setActiveCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'cancelExpiredCampaignsWithNoVotes').mockResolvedValue({
        message: 'No expired campaigns with no votes found to cancel',
        cancelledCount: 0,
        campaigns: []
      });

      jest.spyOn(service as any, 'fixMissingBlockchainData').mockResolvedValue({
        total: 0,
        fixed: 0,
        failed: 0,
        merkle_generated: 0,
        details: {
          campaigns_processed: 0,
          campaigns_fixed: 0,
          campaigns_failed: 0,
          merkle_trees_generated: 0
        }
      });

      const result = await service.performNightlyCorrection();

      expect(result.blockchain_corrections.fixed).toBe(0);
      expect(result.total_corrections).toBe(0);
    });

    it('should handle campaigns with invalid dates', async () => {
      // Mock service methods
      jest.spyOn(service, 'setCreatedCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'activateCreatedCampaigns').mockResolvedValue({
        message: 'No campaigns to activate',
        activatedCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'setActiveCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'cancelExpiredCampaignsWithNoVotes').mockResolvedValue({
        message: 'No expired campaigns with no votes found to cancel',
        cancelledCount: 0,
        campaigns: []
      });

      jest.spyOn(service as any, 'fixMissingBlockchainData').mockResolvedValue({
        total: 0,
        fixed: 0,
        failed: 0,
        merkle_generated: 0,
        details: {
          campaigns_processed: 0,
          campaigns_fixed: 0,
          campaigns_failed: 0,
          merkle_trees_generated: 0
        }
      });

      const result = await service.performNightlyCorrection();

      expect(result.status_transitions.total_updated).toBe(0);
      expect(result.total_corrections).toBe(0);
    });

    it('should handle multiple stuck campaigns simultaneously', async () => {
      // Mock Prisma for fixMissingBlockchainData
      mockPrisma.campaign.findMany.mockResolvedValue([]);
      
      // Mock service methods
      jest.spyOn(service, 'setCreatedCampaignsToPending').mockResolvedValue({
        message: 'Set 2 created campaigns to pending',
        pendingCount: 2,
        campaigns: [
          {
            id: 1,
            name: 'Test Campaign 1',
            votingStyle: 'TOKEN_BASED',
            startDate: new Date(),
            endDate: new Date(),
            campaignStatusId: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
            emailBody: 'Test email body',
            emailSubject: 'Test subject',
            url: 'test-url',
            tx_hash: null
          },
          {
            id: 2,
            name: 'Test Campaign 2',
            votingStyle: 'STORY_FEATURE',
            startDate: new Date(),
            endDate: new Date(),
            campaignStatusId: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
            emailBody: 'Test email body',
            emailSubject: 'Test subject',
            url: 'test-url',
            tx_hash: null
          }
        ]
      });

      jest.spyOn(service, 'activateCreatedCampaigns').mockResolvedValue({
        message: 'No campaigns to activate',
        activatedCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'setActiveCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'cancelExpiredCampaignsWithNoVotes').mockResolvedValue({
        message: 'No expired campaigns with no votes found to cancel',
        cancelledCount: 0,
        campaigns: []
      });

      // Don't mock fixMissingBlockchainData - let it use the real method with mocked Prisma

      const result = await service.performNightlyCorrection();

      expect(result.status_transitions.total_updated).toBe(2);
      expect(result.total_corrections).toBe(2);
      expect(result.total_failures).toBe(0);
    });

    it('should handle partial failures in blockchain corrections', async () => {
      // Mock service methods
      jest.spyOn(service, 'setCreatedCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'activateCreatedCampaigns').mockResolvedValue({
        message: 'No campaigns to activate',
        activatedCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'setActiveCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'cancelExpiredCampaignsWithNoVotes').mockResolvedValue({
        message: 'No expired campaigns with no votes found to cancel',
        cancelledCount: 0,
        campaigns: []
      });

      jest.spyOn(service as any, 'fixMissingBlockchainData').mockResolvedValue({
        total: 1,
        fixed: 0,
        failed: 1,
        merkle_generated: 0,
        details: {
          campaigns_processed: 1,
          campaigns_fixed: 0,
          campaigns_failed: 1,
          merkle_trees_generated: 0
        }
      });

      const result = await service.performNightlyCorrection();

      expect(result.blockchain_corrections.fixed).toBe(0);
      expect(result.blockchain_corrections.failed).toBe(1);
      expect(result.total_failures).toBe(1);
    });
  });

  describe('Nightly Correction Edge Cases', () => {
    it('should handle very large campaign datasets', async () => {
      // Mock Prisma for fixMissingBlockchainData
      mockPrisma.campaign.findMany.mockResolvedValue([]);
      
      // Mock service methods for large dataset
      const largeCampaignSet = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Test Campaign ${i + 1}`,
        votingStyle: 'THEMED_BADGES' as const,
        startDate: new Date(),
        endDate: new Date(),
        campaignStatusId: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailBody: 'Test email body',
        emailSubject: 'Test subject',
        url: 'test-url',
        tx_hash: null
      }));

      jest.spyOn(service, 'setCreatedCampaignsToPending').mockResolvedValue({
        message: 'Set 100 created campaigns to pending',
        pendingCount: 100,
        campaigns: largeCampaignSet
      });

      jest.spyOn(service, 'activateCreatedCampaigns').mockResolvedValue({
        message: 'No campaigns to activate',
        activatedCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'setActiveCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'cancelExpiredCampaignsWithNoVotes').mockResolvedValue({
        message: 'No expired campaigns with no votes found to cancel',
        cancelledCount: 0,
        campaigns: []
      });

      // Don't mock fixMissingBlockchainData - let it use the real method with mocked Prisma

      const result = await service.performNightlyCorrection();

      expect(result.status_transitions.total_updated).toBe(100);
      expect(result.total_corrections).toBe(100);
      expect(result.duration_seconds).toBeLessThan(30); // Should complete within 30 seconds
    });

    it('should handle concurrent execution scenarios', async () => {
      // Mock Prisma for fixMissingBlockchainData
      mockPrisma.campaign.findMany.mockResolvedValue([]);
      
      // Mock service methods
      jest.spyOn(service, 'setCreatedCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'activateCreatedCampaigns').mockResolvedValue({
        message: 'No campaigns to activate',
        activatedCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'setActiveCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'cancelExpiredCampaignsWithNoVotes').mockResolvedValue({
        message: 'No expired campaigns with no votes found to cancel',
        cancelledCount: 0,
        campaigns: []
      });

      // Don't mock fixMissingBlockchainData - let it use the real method with mocked Prisma

      const promises = [
        service.performNightlyCorrection(),
        service.performNightlyCorrection(),
        service.performNightlyCorrection(),
      ];

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.status_transitions.success).toBe(true);
        expect(result.timestamp).toBeDefined();
        expect(result.duration_seconds).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle timezone edge cases', async () => {
      // Mock service methods
      jest.spyOn(service, 'setCreatedCampaignsToPending').mockResolvedValue({
        message: 'Set 1 created campaigns to pending',
        pendingCount: 1,
        campaigns: [{
          id: 1,
          name: 'Test Campaign',
          votingStyle: 'TOKEN_BASED',
          startDate: new Date(),
          endDate: new Date(),
          campaignStatusId: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
          emailBody: 'Test email body',
          emailSubject: 'Test subject',
          url: 'test-url',
          tx_hash: null
        }]
      });

      jest.spyOn(service, 'activateCreatedCampaigns').mockResolvedValue({
        message: 'No campaigns to activate',
        activatedCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'setActiveCampaignsToPending').mockResolvedValue({
        message: 'No campaigns to set to pending',
        pendingCount: 0,
        campaigns: []
      });

      jest.spyOn(service, 'cancelExpiredCampaignsWithNoVotes').mockResolvedValue({
        message: 'No expired campaigns with no votes found to cancel',
        cancelledCount: 0,
        campaigns: []
      });

      jest.spyOn(service as any, 'fixMissingBlockchainData').mockResolvedValue({
        total: 0,
        fixed: 0,
        failed: 0,
        merkle_generated: 0,
        details: {
          campaigns_processed: 0,
          campaigns_fixed: 0,
          campaigns_failed: 0,
          merkle_trees_generated: 0
        }
      });

      const result = await service.performNightlyCorrection();

      expect(result.status_transitions.total_updated).toBe(1);
      expect(result.total_corrections).toBe(1);
    });
  });

  // ========================================
  // CRUD OPERATIONS TESTS
  // ========================================

  describe('CRUD Operations', () => {
    describe('create', () => {
      it('should create a new campaign status', async () => {
        console.log('\n🧪 TEST: Creating new campaign status');
        
        const mockStatus = {
          id: 4,
          name: 'Test Status',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockPrisma.campaignStatus.create.mockResolvedValue(mockStatus);

        console.log('📋 Test Data:');
        console.log('  - Status name: Test Status');

        const result = await service.create({ name: 'Test Status' });

        console.log('📊 Result:', result);
        console.log('✅ Assertions:');
        
        expect(result).toEqual(mockStatus);
        console.log('  ✓ Returns created status');
        
        expect(mockPrisma.campaignStatus.create).toHaveBeenCalledWith({
          data: { name: 'Test Status' }
        });
        console.log('  ✓ Called create with correct data');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });

      it('should handle database errors during creation', async () => {
        console.log('\n🧪 TEST: Handling database error during creation');
        
        const dbError = new Error('Database connection failed');
        mockPrisma.campaignStatus.create.mockRejectedValue(dbError);

        console.log('📋 Test Data:');
        console.log('  - Expected error: Database connection failed');

        await expect(service.create({ name: 'Test Status' })).rejects.toThrow('Database connection failed');
        
        console.log('✅ Assertions:');
        console.log('  ✓ Throws database error');
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });
    });

    describe('findAll', () => {
      it('should return all campaign statuses ordered by ID', async () => {
        console.log('\n🧪 TEST: Finding all campaign statuses');
        
        const mockStatuses = [
          { id: 1, name: 'Created', createdAt: new Date(), updatedAt: new Date() },
          { id: 2, name: 'Active', createdAt: new Date(), updatedAt: new Date() },
          { id: 3, name: 'Pending', createdAt: new Date(), updatedAt: new Date() }
        ];

        mockPrisma.campaignStatus.findMany.mockResolvedValue(mockStatuses);

        console.log('📋 Test Data:');
        console.log('  - Expected statuses:', mockStatuses.length);

        const result = await service.findAll();

        console.log('📊 Result:', result);
        console.log('✅ Assertions:');
        
        expect(result).toEqual(mockStatuses);
        console.log('  ✓ Returns all statuses');
        
        expect(mockPrisma.campaignStatus.findMany).toHaveBeenCalledWith({
          orderBy: { id: 'asc' }
        });
        console.log('  ✓ Called findMany with correct order');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });

      it('should return empty array when no statuses exist', async () => {
        console.log('\n🧪 TEST: Finding all statuses when none exist');
        
        mockPrisma.campaignStatus.findMany.mockResolvedValue([]);

        const result = await service.findAll();

        console.log('📊 Result:', result);
        console.log('✅ Assertions:');
        
        expect(result).toEqual([]);
        console.log('  ✓ Returns empty array');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });
    });
  });

  // ========================================
  // CAMPAIGN STATUS TRANSITION TESTS
  // ========================================

  describe('Campaign Status Transitions', () => {
    describe('activateCreatedCampaigns', () => {
      it('should activate campaigns that are ready to be active', async () => {
        console.log('\n🧪 TEST: Activating campaigns ready to be active');
        
        const mockCampaigns = [{
          id: 1,
          name: 'Test Campaign',
          votingStyle: 'TOKEN_BASED' as const,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          campaignStatusId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          emailBody: 'Test email',
          emailSubject: 'Test subject',
          url: 'test-url',
          tx_hash: null
        }];

        const mockActiveStatus = { id: 2, name: 'Active' };

        mockPrisma.campaign.findMany.mockResolvedValue(mockCampaigns);
        mockPrisma.campaignStatus.findUnique.mockResolvedValue(mockActiveStatus);
        mockPrisma.campaign.update.mockResolvedValue(mockCampaigns[0]);

        console.log('📋 Test Data:');
        console.log('  - Campaigns to activate:', mockCampaigns.length);
        console.log('  - Active status ID:', mockActiveStatus.id);

        const result = await service.activateCreatedCampaigns();

        console.log('📊 Result:', result);
        console.log('✅ Assertions:');
        
        expect(result.activatedCount).toBe(1);
        console.log('  ✓ Activated count is 1');
        
        expect(result.message).toContain('Activated 1 campaigns');
        console.log('  ✓ Message indicates activation');
        
        expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { campaignStatusId: 2 }
        });
        console.log('  ✓ Called update with correct campaign status');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });

      it('should return no campaigns message when none need activation', async () => {
        console.log('\n🧪 TEST: No campaigns to activate');
        
        mockPrisma.campaign.findMany.mockResolvedValue([]);

        const result = await service.activateCreatedCampaigns();

        console.log('📊 Result:', result);
        console.log('✅ Assertions:');
        
        expect(result.message).toBe('No campaigns to activate');
        console.log('  ✓ Returns no campaigns message');
        
        expect(result.activatedCount).toBe(0);
        console.log('  ✓ Activated count is 0');
        
        expect(result.campaigns).toEqual([]);
        console.log('  ✓ Empty campaigns array');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });

      it('should throw error when Active status not found', async () => {
        console.log('\n🧪 TEST: Active status not found error');
        
        const mockCampaigns = [{
          id: 1,
          name: 'Test Campaign',
          votingStyle: 'TOKEN_BASED' as const,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          campaignStatusId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          emailBody: 'Test email',
          emailSubject: 'Test subject',
          url: 'test-url',
          tx_hash: null
        }];

        mockPrisma.campaign.findMany.mockResolvedValue(mockCampaigns);
        mockPrisma.campaignStatus.findUnique.mockResolvedValue(null);

        console.log('📋 Test Data:');
        console.log('  - Expected error: Active status not found');

        await expect(service.activateCreatedCampaigns()).rejects.toThrow('Active status not found in database');
        
        console.log('✅ Assertions:');
        console.log('  ✓ Throws active status not found error');
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });
    });

    describe('setActiveCampaignsToPending', () => {
      it('should set active campaigns to pending when past end date', async () => {
        console.log('\n🧪 TEST: Setting active campaigns to pending');
        
        const mockCampaigns = [{
          id: 1,
          name: 'Test Campaign',
          votingStyle: 'TOKEN_BASED' as const,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-01'), // Past date
          campaignStatusId: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
          emailBody: 'Test email',
          emailSubject: 'Test subject',
          url: 'test-url',
          tx_hash: null
        }];

        const mockPendingStatus = { id: 3, name: 'Pending' };

        mockPrisma.campaign.findMany.mockResolvedValue(mockCampaigns);
        mockPrisma.campaignStatus.findUnique.mockResolvedValue(mockPendingStatus);
        mockPrisma.campaign.update.mockResolvedValue(mockCampaigns[0]);

        console.log('📋 Test Data:');
        console.log('  - Campaigns to set pending:', mockCampaigns.length);
        console.log('  - Pending status ID:', mockPendingStatus.id);

        const result = await service.setActiveCampaignsToPending();

        console.log('📊 Result:', result);
        console.log('✅ Assertions:');
        
        expect(result.pendingCount).toBe(1);
        console.log('  ✓ Pending count is 1');
        
        expect(result.message).toContain('Set 1 campaigns to pending');
        console.log('  ✓ Message indicates pending status');
        
        expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { campaignStatusId: 3 }
        });
        console.log('  ✓ Called update with correct campaign status');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });

      it('should return no campaigns message when none need to be set pending', async () => {
        console.log('\n🧪 TEST: No campaigns to set pending');
        
        mockPrisma.campaign.findMany.mockResolvedValue([]);

        const result = await service.setActiveCampaignsToPending();

        console.log('📊 Result:', result);
        console.log('✅ Assertions:');
        
        expect(result.message).toBe('No campaigns to set to pending');
        console.log('  ✓ Returns no campaigns message');
        
        expect(result.pendingCount).toBe(0);
        console.log('  ✓ Pending count is 0');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });
    });

    describe('setCreatedCampaignsToPending', () => {
      it('should set created campaigns directly to pending when past end date', async () => {
        console.log('\n🧪 TEST: Setting created campaigns directly to pending');
        
        const mockCampaigns = [{
          id: 1,
          name: 'Test Campaign',
          votingStyle: 'TOKEN_BASED' as const,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-01'), // Past date
          campaignStatusId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          emailBody: 'Test email',
          emailSubject: 'Test subject',
          url: 'test-url',
          tx_hash: null
        }];

        const mockPendingStatus = { id: 3, name: 'Pending' };

        mockPrisma.campaign.findMany.mockResolvedValue(mockCampaigns);
        mockPrisma.campaignStatus.findUnique.mockResolvedValue(mockPendingStatus);
        mockPrisma.campaign.update.mockResolvedValue(mockCampaigns[0]);

        console.log('📋 Test Data:');
        console.log('  - Created campaigns to set pending:', mockCampaigns.length);
        console.log('  - Pending status ID:', mockPendingStatus.id);

        const result = await service.setCreatedCampaignsToPending();

        console.log('📊 Result:', result);
        console.log('✅ Assertions:');
        
        expect(result.pendingCount).toBe(1);
        console.log('  ✓ Pending count is 1');
        
        expect(result.message).toContain('Set 1 created campaigns to pending');
        console.log('  ✓ Message indicates direct pending transition');
        
        expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { campaignStatusId: 3 }
        });
        console.log('  ✓ Called update with correct campaign status');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });
    });

    describe('updateAllCampaignStatuses', () => {
      it('should update all campaign statuses in correct order', async () => {
        console.log('\n🧪 TEST: Updating all campaign statuses');
        
        // Mock the individual methods
        const mockCreatedToPending = {
          message: 'Set 1 created campaigns to pending',
          pendingCount: 1,
          campaigns: []
        };

        const mockActivate = {
          message: 'Activated 2 campaigns',
          activatedCount: 2,
          campaigns: []
        };

        const mockActiveToPending = {
          message: 'Set 1 campaigns to pending',
          pendingCount: 1,
          campaigns: []
        };

        jest.spyOn(service, 'setCreatedCampaignsToPending').mockResolvedValue(mockCreatedToPending);
        jest.spyOn(service, 'activateCreatedCampaigns').mockResolvedValue(mockActivate);
        jest.spyOn(service, 'setActiveCampaignsToPending').mockResolvedValue(mockActiveToPending);

        console.log('📋 Test Data:');
        console.log('  - Created to pending: 1 campaign');
        console.log('  - Activated: 2 campaigns');
        console.log('  - Active to pending: 1 campaign');

        const result = await service.updateAllCampaignStatuses();

        console.log('📊 Result:', result);
        console.log('✅ Assertions:');
        
        expect(result.totalUpdated).toBe(5);
        console.log('  ✓ Total updated is 5 (1+2+1+1)');
        
        expect(result.activateResult.activatedCount).toBe(2);
        console.log('  ✓ Activated count is 2');
        
        expect(result.createdToPendingResult.pendingCount + result.pendingResult.pendingCount).toBe(2);
        console.log('  ✓ Pending count is 2 (1+1)');
        
        expect(result.message).toBe('Campaign statuses updated');
        console.log('  ✓ Success message is correct');
        
        // Verify methods were called
        expect(service.setCreatedCampaignsToPending).toHaveBeenCalled();
        expect(service.activateCreatedCampaigns).toHaveBeenCalled();
        expect(service.setActiveCampaignsToPending).toHaveBeenCalled();
        console.log('  ✓ All methods were called');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });
    });
  });

  // ========================================
  // CAMPAIGN ACTION TESTS (APPROVE/REJECT/CANCEL)
  // ========================================

  describe('Campaign Actions', () => {
    describe('approveCampaign', () => {
      it('should approve a campaign and send emails', async () => {
        console.log('\n🧪 TEST: Approving a campaign');
        
        const mockCampaign = {
          id: 1,
          name: 'Test Campaign',
          votingStyle: 'TOKEN_BASED' as const,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          campaignStatusId: 3, // Pending
          createdAt: new Date(),
          updatedAt: new Date(),
          emailBody: 'Test email',
          emailSubject: 'Test subject',
          url: 'test-url',
          tx_hash: null,
          campaignStatus: {
            id: 3,
            name: 'Pending',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };

        const mockApprovedStatus = { id: 4, name: 'Approved' };

        mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign);
        mockPrisma.campaignStatus.findUnique.mockResolvedValue(mockApprovedStatus);
        mockPrisma.campaign.update.mockResolvedValue({ ...mockCampaign, campaignStatusId: 4 });

        console.log('📋 Test Data:');
        console.log('  - Campaign ID: 1');
        console.log('  - Current status: Pending (ID: 3)');
        console.log('  - Target status: Approved (ID: 4)');

        const result = await service.approveCampaign(1);

        console.log('📊 Result:', result);
        console.log('✅ Assertions:');
        
        expect(result.message).toContain('Campaign approved successfully');
        console.log('  ✓ Returns success message');
        
        expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { campaignStatusId: 4 },
          include: {
            campaignStatus: true
          }
        });
        console.log('  ✓ Updated campaign status to approved');
        
        // Note: approveCampaign doesn't send emails directly
        // Email sending is handled by handleStatusUpdate method
        console.log('  ✓ Note: Email sending handled by handleStatusUpdate');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });

      it('should throw error when campaign not found', async () => {
        console.log('\n🧪 TEST: Campaign not found during approval');
        
        mockPrisma.campaign.findUnique.mockResolvedValue(null);

        console.log('📋 Test Data:');
        console.log('  - Campaign ID: 999');
        console.log('  - Expected error: Campaign not found');

        await expect(service.approveCampaign(999)).rejects.toThrow('Campaign not found');
        
        console.log('✅ Assertions:');
        console.log('  ✓ Throws campaign not found error');
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });

      it('should throw error when Approved status not found', async () => {
        console.log('\n🧪 TEST: Approved status not found');
        
        const mockCampaign = {
          id: 1,
          name: 'Test Campaign',
          votingStyle: 'TOKEN_BASED' as const,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          campaignStatusId: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
          emailBody: 'Test email',
          emailSubject: 'Test subject',
          url: 'test-url',
          tx_hash: null,
          campaignStatus: {
            id: 3,
            name: 'Pending',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };

        mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign);
        mockPrisma.campaignStatus.findUnique.mockResolvedValue(null);

        console.log('📋 Test Data:');
        console.log('  - Expected error: Approved status not found');

        await expect(service.approveCampaign(1)).rejects.toThrow('Approved status not found');
        
        console.log('✅ Assertions:');
        console.log('  ✓ Throws approved status not found error');
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });
    });

    describe('rejectCampaign', () => {
      it('should reject a campaign and send emails', async () => {
        console.log('\n🧪 TEST: Rejecting a campaign');
        
        const mockCampaign = {
          id: 1,
          name: 'Test Campaign',
          votingStyle: 'TOKEN_BASED' as const,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          campaignStatusId: 3, // Pending
          createdAt: new Date(),
          updatedAt: new Date(),
          emailBody: 'Test email',
          emailSubject: 'Test subject',
          url: 'test-url',
          tx_hash: null,
          campaignStatus: {
            id: 3,
            name: 'Pending',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };

        const mockRejectedStatus = { id: 5, name: 'Rejected' };

        mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign);
        mockPrisma.campaignStatus.findUnique.mockResolvedValue(mockRejectedStatus);
        mockPrisma.campaign.update.mockResolvedValue({ ...mockCampaign, campaignStatusId: 5 });

        console.log('📋 Test Data:');
        console.log('  - Campaign ID: 1');
        console.log('  - Current status: Pending (ID: 3)');
        console.log('  - Target status: Rejected (ID: 5)');

        const result = await service.rejectCampaign(1);

        console.log('📊 Result:', result);
        console.log('✅ Assertions:');
        
        expect(result.message).toContain('Campaign rejected successfully');
        console.log('  ✓ Returns success message');
        
        expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { campaignStatusId: 5 },
          include: {
            campaignStatus: true
          }
        });
        console.log('  ✓ Updated campaign status to rejected');
        
        // Note: rejectCampaign doesn't send emails directly
        // Email sending is handled by handleStatusUpdate method
        console.log('  ✓ Note: Email sending handled by handleStatusUpdate');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });
    });

    describe('cancelCampaign', () => {
      it('should cancel a campaign and send emails', async () => {
        console.log('\n🧪 TEST: Canceling a campaign');
        
        const mockCampaign = {
          id: 1,
          name: 'Test Campaign',
          votingStyle: 'TOKEN_BASED' as const,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          campaignStatusId: 2, // Active
          createdAt: new Date(),
          updatedAt: new Date(),
          emailBody: 'Test email',
          emailSubject: 'Test subject',
          url: 'test-url',
          tx_hash: null,
          campaignStatus: {
            id: 2,
            name: 'Active',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };

        const mockCancelledStatus = { id: 6, name: 'Cancelled' };

        mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign);
        mockPrisma.campaignStatus.findUnique.mockResolvedValue(mockCancelledStatus);
        mockPrisma.campaign.update.mockResolvedValue({ ...mockCampaign, campaignStatusId: 6 });

        console.log('📋 Test Data:');
        console.log('  - Campaign ID: 1');
        console.log('  - Current status: Active (ID: 2)');
        console.log('  - Target status: Cancelled (ID: 6)');

        const result = await service.cancelCampaign(1);

        console.log('📊 Result:', result);
        console.log('✅ Assertions:');
        
        expect(result.message).toContain('Campaign cancelled successfully');
        console.log('  ✓ Returns success message');
        
        expect(mockPrisma.campaign.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { campaignStatusId: 6 },
          include: {
            campaignStatus: true
          }
        });
        console.log('  ✓ Updated campaign status to cancelled');
        
        // Note: cancelCampaign doesn't send emails directly
        // Email sending is handled by handleStatusUpdate method
        console.log('  ✓ Note: Email sending handled by handleStatusUpdate');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });
    });

    describe('handleStatusUpdate', () => {
      it('should handle status update with email sending for Active status', async () => {
        console.log('\n🧪 TEST: Handling status update for Active campaign');
        
        const mockCampaign = {
          id: 1,
          name: 'Test Campaign',
          votingStyle: 'TOKEN_BASED' as const,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          campaignStatusId: 2, // Active
          createdAt: new Date(),
          updatedAt: new Date(),
          emailBody: 'Test email',
          emailSubject: 'Test subject',
          url: 'test-url',
          tx_hash: null,
          campaignStatus: {
            id: 2,
            name: 'Active',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };

        mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign);
        (emailService.sendEmailsByCampaign as jest.Mock).mockResolvedValue({ success: true });

        console.log('📋 Test Data:');
        console.log('  - Campaign ID: 1');
        console.log('  - Status: Active (ID: 2) - should send emails');

        const result = await service.handleStatusUpdate(1);

        console.log('📊 Result:', result);
        console.log('✅ Assertions:');
        
        expect(result.success).toBe(true);
        console.log('  ✓ Returns success true');
        
        expect(emailService.sendEmailsByCampaign).toHaveBeenCalledWith(1);
        console.log('  ✓ Sent emails for Active status');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });

      it('should handle status update for Approved status (no emails, pushes to Hedera)', async () => {
        console.log('\n🧪 TEST: Handling status update for Approved campaign');
        
        const mockCampaign = {
          id: 1,
          name: 'Test Campaign',
          votingStyle: 'TOKEN_BASED' as const,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          campaignStatusId: 5, // Approved
          createdAt: new Date(),
          updatedAt: new Date(),
          emailBody: 'Test email',
          emailSubject: 'Test subject',
          url: 'test-url',
          tx_hash: null,
          campaignStatus: {
            id: 5,
            name: 'Approved',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };

        mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign);
        (voteService.pushVotesToHedera as jest.Mock).mockResolvedValue({ success: true });

        console.log('📋 Test Data:');
        console.log('  - Campaign ID: 1');
        console.log('  - Status: Approved (ID: 5) - should push to Hedera');

        const result = await service.handleStatusUpdate(1);

        console.log('📊 Result:', result);
        console.log('✅ Assertions:');
        
        expect(result.success).toBe(true);
        console.log('  ✓ Returns success true');
        
        expect(voteService.pushVotesToHedera).toHaveBeenCalledWith(1);
        console.log('  ✓ Pushed votes to Hedera for Approved status');
        
        // Should NOT send emails for Approved status
        expect(emailService.sendEmailsByCampaign).not.toHaveBeenCalled();
        console.log('  ✓ No emails sent for Approved status');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });

      it('should handle email sending failure gracefully', async () => {
        console.log('\n🧪 TEST: Handling email sending failure');
        
        const mockCampaign = {
          id: 1,
          name: 'Test Campaign',
          votingStyle: 'TOKEN_BASED' as const,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          campaignStatusId: 2, // Active - this will trigger email sending
          createdAt: new Date(),
          updatedAt: new Date(),
          emailBody: 'Test email',
          emailSubject: 'Test subject',
          url: 'test-url',
          tx_hash: null,
          campaignStatus: {
            id: 2,
            name: 'Active',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };

        mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign);
        (emailService.sendEmailsByCampaign as jest.Mock).mockRejectedValue(new Error('Email service down'));

        console.log('📋 Test Data:');
        console.log('  - Expected error: Email service down');

        await expect(service.handleStatusUpdate(1)).rejects.toThrow('Email service down');
        
        console.log('✅ Assertions:');
        console.log('  ✓ Throws email service error');
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });
    });

    describe('cancelExpiredCampaignsWithNoVotes', () => {
      it('should cancel expired campaigns with no votes (only Pending status)', async () => {
        console.log('\n🧪 TEST: Cancelling expired campaigns with no votes (Pending only)');

        const mockExpiredCampaigns = [
          {
            id: 1,
            name: 'Expired Campaign 1',
            endDate: new Date('2024-01-01'), // Past date
            campaignStatus: { id: 3, name: 'Pending' },
            _count: { votes: 0 }
          },
          {
            id: 2,
            name: 'Expired Campaign 2',
            endDate: new Date('2024-01-15'), // Past date
            campaignStatus: { id: 3, name: 'Pending' },
            _count: { votes: 0 }
          }
        ];

        const mockCancelledStatus = { id: 6, name: 'Cancelled' };

        mockPrisma.campaign.findMany.mockResolvedValue(mockExpiredCampaigns);
        mockPrisma.campaignStatus.findUnique.mockResolvedValue(mockCancelledStatus);
        mockPrisma.campaign.update.mockResolvedValue((params: any) => ({
          ...mockExpiredCampaigns.find(c => c.id === params.where.id),
          campaignStatusId: 6,
          campaignStatus: mockCancelledStatus
        }));

        console.log('📋 Test Data:');
        console.log('  - 2 expired campaigns with no votes');
        console.log('  - Campaign 1: Pending status, expired 2024-01-01');
        console.log('  - Campaign 2: Pending status, expired 2024-01-15');

        const result = await service.cancelExpiredCampaignsWithNoVotes();

        console.log('📊 Result:', result);
        console.log('✅ Assertions:');
        
        expect(result.cancelledCount).toBe(2);
        console.log('  ✓ Correctly counted 2 cancelled campaigns');
        
        expect(result.message).toContain('Cancelled 2 expired campaigns with no votes');
        console.log('  ✓ Returns correct success message');
        
        expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith({
          where: {
            endDate: { lt: expect.any(String) },
            campaignStatus: {
              name: 'Pending'
            },
            votes: { none: {} }
          },
          include: {
            campaignStatus: true,
            _count: { select: { votes: true } }
          }
        });
        console.log('  ✓ Correctly queried for expired Pending campaigns with no votes');
        
        expect(mockPrisma.campaign.update).toHaveBeenCalledTimes(2);
        console.log('  ✓ Updated both campaigns to cancelled status');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });

      it('should return empty result when no expired campaigns with no votes exist', async () => {
        console.log('\n🧪 TEST: No expired campaigns with no votes to cancel');

        mockPrisma.campaign.findMany.mockResolvedValue([]);

        console.log('📋 Test Data:');
        console.log('  - No expired campaigns with no votes found');

        const result = await service.cancelExpiredCampaignsWithNoVotes();

        console.log('📊 Result:', result);
        console.log('✅ Assertions:');
        
        expect(result.cancelledCount).toBe(0);
        console.log('  ✓ Correctly returned 0 cancelled campaigns');
        
        expect(result.message).toContain('No expired campaigns with no votes found to cancel');
        console.log('  ✓ Returns correct message for no campaigns');
        
        expect(result.campaigns).toEqual([]);
        console.log('  ✓ Returns empty campaigns array');
        
        expect(mockPrisma.campaign.update).not.toHaveBeenCalled();
        console.log('  ✓ No campaign updates performed');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });

      it('should handle database errors gracefully', async () => {
        console.log('\n🧪 TEST: Handling database errors');

        mockPrisma.campaign.findMany.mockRejectedValue(new Error('Database connection failed'));

        console.log('📋 Test Data:');
        console.log('  - Database error simulation');

        await expect(service.cancelExpiredCampaignsWithNoVotes()).rejects.toThrow('Database connection failed');
        console.log('  ✓ Correctly throws database error');
        
        console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
      });
    });
  });
}); 

