# 🧪 Project Module Testing Guide

This module handles project creation, management, and AWS S3 integration for project images.

## 📊 Test Coverage

### 📝 **PLACEHOLDER TESTS (1 Test)**

**Test File:** `project.service.spec.ts`

**Current Status:** Placeholder tests documenting service structure and business logic.

## 🚀 Running Tests

### **Run Project Module Tests:**
```bash
npx jest --config test/jest-unit.json src/project/project.service.spec.ts
```

## 🧪 Service Structure

### **Expected Methods:**
- `create` - Create new projects
- `findAll` - Retrieve all projects
- `findOne` - Find project by ID
- `update` - Update project data
- `remove` - Delete project
- `uploadImage` - Upload project image to S3
- `getProjectsByCampaign` - Get projects for a campaign
- `getProjectsWithDetails` - Get projects with full details

## 🔧 Business Logic

### **Project Rules:**
- Projects must have valid names and descriptions
- Projects can be associated with multiple campaigns
- Project images are stored in AWS S3
- Projects have status tracking
- Projects can be categorized by type and ecosystem

## 🧪 Integration Points

### **AWS S3 Integration:**
- Project images are uploaded to S3 buckets
- Image URLs are stored in database
- Image processing and optimization
- S3 bucket management and permissions

### **Database Integration:**
- Project records are stored in PostgreSQL
- Project relationships with campaigns and SDGs
- Project status tracking
- Project metadata and categorization

## 🐛 Error Scenarios

### **Expected Error Handling:**
- Invalid project data
- S3 upload failures
- Database constraint violations
- Duplicate project names
- Invalid relationships

## 📚 Dependencies

- **PrismaClient:** Database operations
- **S3Client:** AWS S3 file storage
- **ProjectStatusService:** Status management
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
4. **Performance tests** for large project datasets
5. **Image processing tests** for S3 uploads

## 🔧 Manual Testing

### **Testing Project Creation:**
1. Create project with valid data
2. Verify project is stored in database
3. Check project status is set correctly
4. Verify project relationships

### **Testing Image Upload:**
1. Upload project image
2. Verify image is stored in S3
3. Check image URL is updated in database
4. Test image access and permissions

### **Testing Project Relationships:**
1. Associate projects with campaigns
2. Associate projects with SDGs
3. Verify relationship data in database
4. Test project-campaign queries

## 📋 Test Data Verification

### **Check Project Data:**
```sql
SELECT 
    id, 
    name,
    description,
    "projectTypeId",
    "ecosystemTypeId",
    "landUseTypeId",
    "projectStatusId",
    image_url,
    created_at
FROM "Project" 
ORDER BY created_at DESC
LIMIT 10;
```

### **Check Project-Campaign Relationships:**
```sql
SELECT 
    p.id as project_id,
    p.name as project_name,
    c.id as campaign_id,
    c.name as campaign_name
FROM "Project" p
JOIN "CampaignProject" cp ON p.id = cp."projectId"
JOIN "Campaign" c ON cp."campaignId" = c.id
WHERE p.id = [PROJECT_ID];
```

### **Check Project-SDG Relationships:**
```sql
SELECT 
    p.id as project_id,
    p.name as project_name,
    s.id as sdg_id,
    s.name as sdg_name
FROM "Project" p
JOIN "ProjectSdg" ps ON p.id = ps."projectId"
JOIN "Sdg" s ON ps."sdgId" = s.id
WHERE p.id = [PROJECT_ID];
```

### **Check Project Status:**
```sql
SELECT 
    p.id,
    p.name,
    ps.name as status_name,
    pt.name as type_name,
    et.name as ecosystem_name
FROM "Project" p
JOIN "ProjectStatus" ps ON p."projectStatusId" = ps.id
JOIN "ProjectType" pt ON p."projectTypeId" = pt.id
JOIN "EcosystemType" et ON p."ecosystemTypeId" = et.id
ORDER BY p.created_at DESC;
``` 