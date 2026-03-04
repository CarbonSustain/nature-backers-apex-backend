# 🧪 Campaign Project Module Testing Guide

This module handles the many-to-many relationship between campaigns and projects.

## 📊 Test Coverage

### 📝 **PLACEHOLDER TESTS (5 Tests)**

**Test File:** `campaign_project.service.spec.ts`

**Current Status:** Placeholder tests documenting service structure and business logic.

## 🚀 Running Tests

### **Run Campaign Project Module Tests:**
```bash
npx jest --config test/jest-unit.json src/campaign_project/campaign_project.service.spec.ts
```

## 🧪 Service Structure

### **Expected Methods:**
- `create` - Create new campaign-project relationships
- `findAll` - Retrieve all campaign-project relationships
- `findOne` - Find relationship by ID
- `update` - Update relationship data
- `remove` - Delete relationship
- `assignProjectToCampaign` - Assign project to campaign
- `removeProjectFromCampaign` - Remove project from campaign
- `getProjectsByCampaign` - Get all projects for a campaign
- `getCampaignsByProject` - Get all campaigns for a project

## 🔧 Business Logic

### **Campaign-Project Rules:**
- Many-to-many relationship management
- Campaign and project association
- Validation of existing relationships
- Cascade operations when campaigns/projects are deleted
- Relationship integrity checks
- Project ordering within campaigns
- Campaign-project status tracking

## 🧪 Integration Points

### **Campaign Integration:**
- Campaign validation before assignment
- Campaign relationship queries
- Campaign-based filtering
- Campaign cascade operations
- Campaign status impact on projects

### **Project Integration:**
- Project validation before assignment
- Project relationship queries
- Project-based filtering
- Project cascade operations
- Project status impact on campaigns

## 🐛 Error Scenarios

### **Expected Error Handling:**
- Invalid campaign or project IDs
- Duplicate relationship creation
- Database constraint violations
- Orphaned relationship cleanup
- Cascade operation failures
- Invalid project ordering
- Status validation errors

## 📚 Dependencies

- **PrismaClient:** Database operations
- **CampaignService:** Campaign validation
- **ProjectService:** Project validation
- **ValidationService:** Data validation

## 🎯 Future Testing Improvements

### **Refactoring Recommendations:**
1. **Use dependency injection** for PrismaClient
2. **Add validation service** integration
3. **Implement relationship event handling**
4. **Add transaction support** for complex operations
5. **Add project ordering logic**

### **Comprehensive Testing Plan:**
1. **Unit tests** for all public methods
2. **Integration tests** for relationship management
3. **Error handling tests** for various failure scenarios
4. **Performance tests** for large datasets
5. **Cascade operation tests** for deletions
6. **Ordering tests** for project sequences

## 🔧 Manual Testing

### **Testing Relationship Creation:**
1. Create campaign-project relationship
2. Verify relationship is stored in database
3. Check relationship integrity
4. Test duplicate relationship prevention
5. Verify project ordering

### **Testing Relationship Queries:**
1. Query projects by campaign
2. Query campaigns by project
3. Test relationship filtering
4. Verify relationship counts
5. Test ordering functionality

### **Testing Cascade Operations:**
1. Delete campaign and verify project relationships
2. Delete project and verify campaign relationships
3. Test relationship cleanup
4. Verify data consistency
5. Test status propagation

## 📋 Test Data Verification

### **Check Campaign-Project Relationships:**
```sql
SELECT 
    cp.id,
    c.id as campaign_id,
    c.name as campaign_name,
    p.id as project_id,
    p.name as project_name,
    cp.created_at
FROM "CampaignProject" cp
JOIN "Campaign" c ON cp."campaignId" = c.id
JOIN "Project" p ON cp."projectId" = p.id
ORDER BY cp.created_at DESC;
```

### **Check Projects by Campaign:**
```sql
SELECT 
    p.id,
    p.name as project_name,
    c.name as campaign_name,
    cp.created_at
FROM "Project" p
JOIN "CampaignProject" cp ON p.id = cp."projectId"
JOIN "Campaign" c ON cp."campaignId" = c.id
WHERE c.id = [CAMPAIGN_ID]
ORDER BY cp.created_at;
```

### **Check Campaigns by Project:**
```sql
SELECT 
    c.id,
    c.name as campaign_name,
    p.name as project_name,
    cp.created_at
FROM "Campaign" c
JOIN "CampaignProject" cp ON c.id = cp."campaignId"
JOIN "Project" p ON cp."projectId" = p.id
WHERE p.id = [PROJECT_ID]
ORDER BY cp.created_at;
```

### **Check Relationship Counts:**
```sql
-- Count relationships per campaign
SELECT 
    c.id,
    c.name as campaign_name,
    COUNT(cp."projectId") as project_count
FROM "Campaign" c
LEFT JOIN "CampaignProject" cp ON c.id = cp."campaignId"
GROUP BY c.id, c.name
ORDER BY project_count DESC;

-- Count relationships per project
SELECT 
    p.id,
    p.name as project_name,
    COUNT(cp."campaignId") as campaign_count
FROM "Project" p
LEFT JOIN "CampaignProject" cp ON p.id = cp."projectId"
GROUP BY p.id, p.name
ORDER BY campaign_count DESC;
```

### **Check Campaign-Project Status:**
```sql
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    cs.name as campaign_status,
    p.id as project_id,
    p.name as project_name,
    ps.name as project_status
FROM "Campaign" c
JOIN "CampaignProject" cp ON c.id = cp."campaignId"
JOIN "Project" p ON cp."projectId" = p.id
JOIN "CampaignStatus" cs ON c."campaignStatusId" = cs.id
JOIN "ProjectStatus" ps ON p."projectStatusId" = ps.id
ORDER BY c.created_at DESC, p.name;
```

## 🔍 Relationship Testing Scenarios

### **Basic Relationship Operations:**
1. **Assign project to campaign**
2. **Remove project from campaign**
3. **Query projects by campaign**
4. **Query campaigns by project**
5. **Reorder projects within campaign**

### **Edge Cases:**
1. **Duplicate relationship prevention**
2. **Invalid ID handling**
3. **Cascade deletion testing**
4. **Relationship validation**
5. **Ordering edge cases**

### **Status-Based Testing:**
1. **Campaign status impact on projects**
2. **Project status impact on campaigns**
3. **Status transition validation**
4. **Cross-status relationship handling**

### **Performance Testing:**
1. **Large dataset relationships**
2. **Complex query performance**
3. **Bulk relationship operations**
4. **Memory usage optimization**
5. **Ordering performance**

## 🎯 Campaign-Project Specific Features

### **Project Ordering:**
- Sequential project assignment
- Project reordering within campaigns
- Order validation and constraints
- Bulk ordering operations

### **Status Synchronization:**
- Campaign status impact on projects
- Project status impact on campaigns
- Status transition validation
- Cross-module status consistency

### **Voting Integration:**
- Project voting within campaigns
- Campaign voting impact on projects
- Vote counting and validation
- Results aggregation 