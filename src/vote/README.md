# 🧪 Vote Module Testing Guide

This module handles vote creation, retrieval, and Hedera blockchain integration.

## 📊 Test Coverage

### 📝 **PLACEHOLDER TESTS (5 Tests)**

**Test File:** `vote.service.spec.ts`

**Current Status:** Placeholder tests documenting service structure and business logic.

## 🚀 Running Tests

### **Run Vote Module Tests:**
```bash
npx jest --config test/jest-unit.json src/vote/vote.service.spec.ts
```

## 🧪 Service Structure

### **Expected Methods:**
- `createVote` - Create new votes
- `getVotesByCampaign` - Retrieve votes for a campaign
- `pushVotesToHedera` - Push votes to Hedera blockchain
- `generateVoteProof` - Generate Merkle proof for vote verification
- `pullVotesFromHedera` - Pull votes from Hedera blockchain

## 🔧 Business Logic

### **Voting Rules:**
- Users can only vote once per campaign
- Votes must be associated with valid campaigns and projects
- Vote hashes are generated and stored for blockchain verification
- Vote proofs can be generated for verification

## 🧪 Integration Points

### **Hedera Blockchain Integration:**
- Vote data is pushed to Hedera smart contracts
- Vote hashes are stored for verification
- Merkle trees are generated for vote integrity
- Vote proofs can be verified against blockchain data

### **Database Integration:**
- Vote records are stored in PostgreSQL
- Vote hashes are updated after blockchain transactions
- Vote relationships with campaigns, users, and projects

## 🐛 Error Scenarios

### **Expected Error Handling:**
- Invalid campaign or project IDs
- Duplicate vote attempts
- Blockchain transaction failures
- Database connection issues
- Vote hash generation failures

## 📚 Dependencies

- **PrismaClient:** Database operations
- **ethers.js:** Hedera blockchain interaction
- **MerkleTreeUtil:** Merkle tree generation and verification

## 🎯 Future Testing Improvements

### **Refactoring Recommendations:**
1. **Use dependency injection** for PrismaClient instead of direct instantiation
2. **Extract blockchain logic** to separate service
3. **Add validation service** integration
4. **Implement proper error handling** with custom exceptions

### **Comprehensive Testing Plan:**
1. **Unit tests** for all public methods
2. **Integration tests** for blockchain operations
3. **Error handling tests** for various failure scenarios
4. **Performance tests** for large vote datasets
5. **Security tests** for vote integrity

## 🔧 Manual Testing

### **Testing Vote Creation:**
1. Create a campaign
2. Assign projects to campaign
3. Create votes for different users
4. Verify vote data in database

### **Testing Blockchain Integration:**
1. Create votes for a campaign
2. Approve campaign to trigger vote push
3. Verify votes appear on Hedera
4. Generate and verify vote proofs

### **Testing Error Scenarios:**
1. Attempt duplicate votes
2. Vote on invalid campaigns/projects
3. Test blockchain network failures
4. Verify proper error responses

## 📋 Test Data Verification

### **Check Vote Data:**
```sql
SELECT 
    id, 
    "campaignId",
    "userId",
    "projectId",
    vote_hash,
    created_at
FROM "Vote" 
WHERE "campaignId" = [CAMPAIGN_ID]
ORDER BY id;
```

### **Check Vote Relationships:**
```sql
SELECT 
    v.id,
    c.name as campaign_name,
    u.business_email as user_email,
    p.name as project_name,
    v.vote_hash
FROM "Vote" v
JOIN "Campaign" c ON v."campaignId" = c.id
JOIN "User" u ON v."userId" = u.id
JOIN "Project" p ON v."projectId" = p.id
WHERE v."campaignId" = [CAMPAIGN_ID];
``` 