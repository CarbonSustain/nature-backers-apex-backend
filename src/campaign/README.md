# 🧪 Campaign Module Testing Guide

This module handles campaign creation, management, and AWS S3 integration for image uploads.

## 📊 Test Coverage

### 📝 **PLACEHOLDER TESTS (5 Tests)**

**Test File:** `campaign.service.spec.ts`

**Current Status:** Placeholder tests documenting service structure and business logic.

## 🚀 Running Tests

### **Run Campaign Module Tests:**
```bash
npx jest --config test/jest-unit.json src/campaign/campaign.service.spec.ts
```

## 🧪 Service Structure

### **Expected Methods:**
- `create` - Create new campaigns
- `findAll` - Retrieve all campaigns
- `findOne` - Find campaign by ID
- `update` - Update campaign data
- `remove` - Delete campaign
- `uploadImage` - Upload campaign image to S3
- `getCampaignsWithProjects` - Get campaigns with associated projects

## 🔧 Business Logic

### **Campaign Rules:**
- Campaigns must have valid start and end dates
- Campaign names must be unique
- Campaign images are stored in AWS S3
- Campaigns can be associated with multiple projects
- Campaign status transitions are managed by CampaignStatusService

## 🧪 Integration Points

### **AWS S3 Integration:**
- Campaign images are uploaded to S3 buckets
- Image URLs are stored in database
- Image processing and optimization
- S3 bucket management and permissions

### **Database Integration:**
- Campaign records are stored in PostgreSQL
- Campaign relationships with projects and departments
- Campaign status tracking
- Campaign metadata and configuration

## 🐛 Error Scenarios

### **Expected Error Handling:**
- Invalid date ranges (start after end)
- Duplicate campaign names
- S3 upload failures
- Database constraint violations
- Invalid campaign data

## 📚 Dependencies

- **PrismaClient:** Database operations
- **S3Client:** AWS S3 file storage
- **CampaignStatusService:** Status management
- **ValidationService:** Data validation

## 🎯 Future Testing Improvements

### **Refactoring Recommendations:**
1. **Use dependency injection** for PrismaClient and S3Client
2. **Extract S3 logic** to separate service
3. **Add validation service** integration
4. **Implement proper error handling** with custom exceptions

### **Comprehensive Testing Plan:**
1. **Unit tests** for all public methods
2. **Integration tests** for S3 operations
3. **Error handling tests** for various failure scenarios
4. **Performance tests** for large campaign datasets
5. **Image processing tests** for S3 uploads

## 🔧 Manual Testing

### **Testing Campaign Creation:**
1. Create campaign with valid data
2. Verify campaign is stored in database
3. Check campaign status is set to "Created"
4. Verify campaign relationships

### **Testing Image Upload:**
1. Upload campaign image
2. Verify image is stored in S3
3. Check image URL is updated in database
4. Test image access and permissions

### **Testing Campaign Relationships:**
1. Associate campaigns with projects
2. Verify relationship data in database
3. Test campaign-project queries
4. Check cascade operations

## 📋 Test Data Verification

### **Check Campaign Data:**
```sql
SELECT 
    id, 
    name,
    "votingStyle",
    start_date,
    end_date,
    "campaignStatusId",
    "emailBody",
    "emailSubject",
    url,
    "tx_hash",
    created_at
FROM "Campaign" 
ORDER BY created_at DESC
LIMIT 10;
```

### **Check Campaign-Project Relationships:**
```sql
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    p.id as project_id,
    p.name as project_name
FROM "Campaign" c
JOIN "CampaignProject" cp ON c.id = cp."campaignId"
JOIN "Project" p ON cp."projectId" = p.id
WHERE c.id = [CAMPAIGN_ID];
```

### **Check Campaign Status:**
```sql
SELECT 
    c.id,
    c.name,
    cs.name as status_name,
    c.start_date,
    c.end_date
FROM "Campaign" c
JOIN "CampaignStatus" cs ON c."campaignStatusId" = cs.id
ORDER BY c.created_at DESC;
``` 