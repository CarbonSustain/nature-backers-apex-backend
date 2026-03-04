# 🧪 Campaign Status Module Testing Guide

This module handles campaign status transitions, nightly corrections, and blockchain data management.

## 📊 Test Coverage

### ✅ **COMPLETE TESTING (35 Tests)**

**Test File:** `campaign-status.service.spec.ts`

### **Test Categories:**

#### **1. Nightly Correction Tests (14 tests)**
- ✅ Stuck campaign states handling
- ✅ Empty results graceful handling
- ✅ Database error handling
- ✅ Comprehensive summary generation
- ✅ Blockchain data correction scenarios

#### **2. CRUD Operations (4 tests)**
- ✅ Creating campaign statuses
- ✅ Finding all statuses
- ✅ Finding statuses when none exist
- ✅ Proper database queries

#### **3. Campaign Status Transitions (7 tests)**
- ✅ Activating campaigns ready to be active
- ✅ Setting active campaigns to pending
- ✅ Setting created campaigns directly to pending
- ✅ No campaigns to activate/pending scenarios
- ✅ Status not found error handling

#### **4. Campaign Actions (7 tests)**
- ✅ Approving campaigns
- ✅ Rejecting campaigns
- ✅ Canceling campaigns
- ✅ Campaign not found errors
- ✅ Status not found errors

#### **5. Auto-Cancellation Tests (3 tests)**
- ✅ Cancelling expired campaigns with no votes (Pending status only)
- ✅ Handling no campaigns to cancel scenario
- ✅ Database error handling for auto-cancellation

## 🚀 Running Tests

### **Run All Campaign Status Tests:**
```bash
npx jest --config test/jest-unit.json src/campaign-status/campaign-status.service.spec.ts
```

### **Run Specific Test Categories:**
```bash
# Nightly correction tests only
npx jest --config test/jest-unit.json src/campaign-status/campaign-status.service.spec.ts --testNamePattern="performNightlyCorrection"

# Status transition tests only
npx jest --config test/jest-unit.json src/campaign-status/campaign-status.service.spec.ts --testNamePattern="activateCreatedCampaigns|setActiveCampaignsToPending"

# Campaign action tests only
npx jest --config test/jest-unit.json src/campaign-status/campaign-status.service.spec.ts --testNamePattern="approveCampaign|rejectCampaign|cancelCampaign"

# Auto-cancellation tests only
npx jest --config test/jest-unit.json src/campaign-status/campaign-status.service.spec.ts --testNamePattern="cancelExpiredCampaignsWithNoVotes"
```

## 🧪 Testing Scenarios

### **Nightly Correction Scenarios:**

#### **Scenario 1A: No Votes Pushed to Hedera**
- **Condition:** Approved campaign with `tx_hash: null` and `votesWithHash: 0`
- **Action:** Push all votes to Hedera blockchain
- **Expected Result:** Generate Merkle tree and set `tx_hash`

#### **Scenario 1B: Partial Votes Pushed**
- **Condition:** Approved campaign with `tx_hash: null`, some votes have hashes, some don't
- **Action:** Clear all vote hashes and retry pushing all votes
- **Expected Result:** Generate Merkle tree and set `tx_hash`

#### **Scenario 1C: All Votes Pushed but No Merkle Tree**
- **Condition:** Approved campaign with `tx_hash: null` but all votes have hashes
- **Action:** Generate Merkle tree from existing vote hashes
- **Expected Result:** Set `tx_hash` to Merkle root

#### **Scenario 1D: Campaign with No Votes**
- **Condition:** Approved campaign with `tx_hash: null` and no votes
- **Action:** Skip (nothing to push)
- **Expected Result:** No action taken

### **Campaign Status Transition Scenarios:**

#### **Scenario 2A: Created → Active**
- **Condition:** Campaign with status "Created" where `startDate <= now` AND `endDate >= now`
- **Action:** Change status to "Active"
- **Expected Result:** Campaign becomes active for voting

#### **Scenario 2B: Active → Pending**
- **Condition:** Campaign with status "Active" where `endDate < now`
- **Action:** Change status to "Pending"
- **Expected Result:** Campaign ends and goes to review

#### **Scenario 2C: Created → Pending (Direct)**
- **Condition:** Campaign with status "Created" where `endDate < now` (completely in the past)
- **Action:** Change status directly to "Pending"
- **Expected Result:** Campaign skips "Active" and goes straight to review

#### **Scenario 2D: Pending → Cancelled (Auto)**
- **Condition:** Campaign with status "Pending" where `endDate < now` AND `voteCount = 0`
- **Action:** Change status to "Cancelled"
- **Expected Result:** Campaign is automatically cancelled due to no engagement

## 🔧 Manual Testing

### **Testing Auto-Cancellation Scenarios:**

#### **Scenario 2D (Auto-Cancellation):**
1. Create campaign with start in 2 minutes, end in 2 minutes
2. Wait for campaign to become active, then pending
3. Ensure no votes are cast during the campaign
4. Call the auto-cancellation endpoint:
```bash
curl -X POST http://localhost:3000/campaign-status/cancel-expired-no-votes
```
5. Check: campaign status should change to "Cancelled"

### **Testing Nightly Correction Scenarios:**

#### **Scenario 1A (No Votes Pushed):**
1. Create campaign with start in 2 minutes, end in 2 minutes
2. Assign projects to campaign
3. Wait for active status
4. Do voting and wait for pending
5. Comment out campaign actions state handler
6. Approve campaign (status changes to approved, but no vote push)
7. Check: status is approved, vote_hash is null
8. Call nightly correction API

#### **Scenario 1B (Partial Votes):**
1. Follow steps 1-6 from Scenario 1A
2. Manually update some votes to have hashes:
```sql
UPDATE "Vote"  
SET vote_hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
WHERE "campaignId" = [CAMPAIGN_ID] 
AND id IN (
    SELECT id FROM "Vote" 
    WHERE "campaignId" = [CAMPAIGN_ID] 
    ORDER BY id 
    LIMIT 2
);
```
3. Call nightly correction API

#### **Scenario 1C (All Votes, No Merkle):**
1. Follow steps 1-6 from Scenario 1A
2. Manually update ALL votes to have hashes:
```sql
UPDATE "Vote"  
SET vote_hash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
WHERE "campaignId" = [CAMPAIGN_ID];
```
3. Call nightly correction API

## 📋 Test Data Verification

### **Check Campaign Status:**
```sql
SELECT 
    id, 
    name, 
    "campaignStatusId",
    "tx_hash",
    start_date,
    end_date
FROM "Campaign" 
WHERE id = [CAMPAIGN_ID];
```

### **Check Vote Hashes:**
```sql
SELECT 
    id, 
    vote_hash, 
    CASE 
        WHEN vote_hash IS NULL THEN '❌ No Hash'
        ELSE '✅ Has Hash'
    END as status
FROM "Vote" 
WHERE "campaignId" = [CAMPAIGN_ID]
ORDER BY id;
```

### **Check Campaign Vote Count:**
```sql
SELECT 
    c.id,
    c.name,
    c."campaignStatusId",
    cs.name as status_name,
    COUNT(v.id) as vote_count
FROM "Campaign" c
JOIN "CampaignStatus" cs ON c."campaignStatusId" = cs.id
LEFT JOIN "Vote" v ON c.id = v."campaignId"
WHERE c.id = [CAMPAIGN_ID]
GROUP BY c.id, c.name, c."campaignStatusId", cs.name;
```

## 🐛 Debugging

### **Common Issues:**
1. **Mock not working:** Ensure mocks are set up before service instantiation
2. **Async test failures:** Use proper async/await patterns
3. **Database connection errors:** All database calls should be mocked
4. **Import errors:** Check file paths and module exports

### **Debugging Tips:**
1. **Use console logs:** Tests include detailed logging for visibility
2. **Run single tests:** Use `--testNamePattern` to run specific tests
3. **Check mock setup:** Verify mocks are properly configured
4. **Review test data:** Ensure test data matches expected structure

## 📚 Dependencies

- **PrismaClient:** Database operations
- **SendEmailService:** Email notifications
- **VoteService:** Blockchain operations
- **MerkleTreeUtil:** Merkle tree generation

## 🎯 Future Improvements

1. **Integration tests** for cross-service functionality
2. **Performance tests** for large datasets
3. **Error recovery tests** for network failures
4. **Concurrent access tests** for race conditions
5. **Auto-cancellation enhancements**:
   - Configurable grace periods
   - Notification system for cancelled campaigns
   - Analytics tracking for cancellation patterns
   - Bulk campaign management features 