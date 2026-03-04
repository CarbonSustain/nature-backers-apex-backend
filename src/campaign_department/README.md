# 🧪 Campaign Department Module Testing Guide

This module handles the many-to-many relationship between campaigns and departments.

## 📊 Test Coverage

### 📝 **PLACEHOLDER TESTS (5 Tests)**

**Test File:** `campaign_department.service.spec.ts`

**Current Status:** Placeholder tests documenting service structure and business logic.

## 🚀 Running Tests

### **Run Campaign Department Module Tests:**
```bash
npx jest --config test/jest-unit.json src/campaign_department/campaign_department.service.spec.ts
```

## 🧪 Service Structure

### **Expected Methods:**
- `create` - Create new campaign-department relationships
- `findAll` - Retrieve all campaign-department relationships
- `findOne` - Find relationship by ID
- `update` - Update relationship data
- `remove` - Delete relationship
- `assignDepartmentToCampaign` - Assign department to campaign
- `removeDepartmentFromCampaign` - Remove department from campaign

## 🔧 Business Logic

### **Campaign-Department Rules:**
- Many-to-many relationship management
- Campaign and department association
- Validation of existing relationships
- Cascade operations when campaigns/departments are deleted
- Relationship integrity checks

## 🧪 Integration Points

### **Campaign Integration:**
- Campaign validation before assignment
- Campaign relationship queries
- Campaign-based filtering
- Campaign cascade operations

### **Department Integration:**
- Department validation before assignment
- Department relationship queries
- Department-based filtering
- Department cascade operations

## 🐛 Error Scenarios

### **Expected Error Handling:**
- Invalid campaign or department IDs
- Duplicate relationship creation
- Database constraint violations
- Orphaned relationship cleanup
- Cascade operation failures

## 📚 Dependencies

- **PrismaClient:** Database operations
- **CampaignService:** Campaign validation
- **DepartmentService:** Department validation
- **ValidationService:** Data validation

## 🎯 Future Testing Improvements

### **Refactoring Recommendations:**
1. **Use dependency injection** for PrismaClient
2. **Add validation service** integration
3. **Implement relationship event handling**
4. **Add transaction support** for complex operations

### **Comprehensive Testing Plan:**
1. **Unit tests** for all public methods
2. **Integration tests** for relationship management
3. **Error handling tests** for various failure scenarios
4. **Performance tests** for large datasets
5. **Cascade operation tests** for deletions

## 🔧 Manual Testing

### **Testing Relationship Creation:**
1. Create campaign-department relationship
2. Verify relationship is stored in database
3. Check relationship integrity
4. Test duplicate relationship prevention

### **Testing Relationship Queries:**
1. Query campaigns by department
2. Query departments by campaign
3. Test relationship filtering
4. Verify relationship counts

### **Testing Cascade Operations:**
1. Delete campaign and verify department relationships
2. Delete department and verify campaign relationships
3. Test relationship cleanup
4. Verify data consistency

## 📋 Test Data Verification

### **Check Campaign-Department Relationships:**
```sql
SELECT 
    cd.id,
    c.id as campaign_id,
    c.name as campaign_name,
    d.id as department_id,
    d.name as department_name,
    cd.created_at
FROM "CampaignDepartment" cd
JOIN "Campaign" c ON cd."campaignId" = c.id
JOIN "Department" d ON cd."departmentId" = d.id
ORDER BY cd.created_at DESC;
```

### **Check Campaigns by Department:**
```sql
SELECT 
    c.id,
    c.name as campaign_name,
    d.name as department_name
FROM "Campaign" c
JOIN "CampaignDepartment" cd ON c.id = cd."campaignId"
JOIN "Department" d ON cd."departmentId" = d.id
WHERE d.id = [DEPARTMENT_ID]
ORDER BY c.created_at DESC;
```

### **Check Departments by Campaign:**
```sql
SELECT 
    d.id,
    d.name as department_name,
    c.name as campaign_name
FROM "Department" d
JOIN "CampaignDepartment" cd ON d.id = cd."departmentId"
JOIN "Campaign" c ON cd."campaignId" = c.id
WHERE c.id = [CAMPAIGN_ID]
ORDER BY d.name;
```

### **Check Relationship Counts:**
```sql
-- Count relationships per campaign
SELECT 
    c.id,
    c.name as campaign_name,
    COUNT(cd."departmentId") as department_count
FROM "Campaign" c
LEFT JOIN "CampaignDepartment" cd ON c.id = cd."campaignId"
GROUP BY c.id, c.name
ORDER BY department_count DESC;

-- Count relationships per department
SELECT 
    d.id,
    d.name as department_name,
    COUNT(cd."campaignId") as campaign_count
FROM "Department" d
LEFT JOIN "CampaignDepartment" cd ON d.id = cd."departmentId"
GROUP BY d.id, d.name
ORDER BY campaign_count DESC;
```

## 🔍 Relationship Testing Scenarios

### **Basic Relationship Operations:**
1. **Assign department to campaign**
2. **Remove department from campaign**
3. **Query campaigns by department**
4. **Query departments by campaign**

### **Edge Cases:**
1. **Duplicate relationship prevention**
2. **Invalid ID handling**
3. **Cascade deletion testing**
4. **Relationship validation**

### **Performance Testing:**
1. **Large dataset relationships**
2. **Complex query performance**
3. **Bulk relationship operations**
4. **Memory usage optimization** 