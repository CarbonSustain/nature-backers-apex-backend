# 🧪 Project SDG Module Testing Guide

This module handles the many-to-many relationship between projects and Sustainable Development Goals (SDGs).

## 📊 Test Coverage

### 📝 **PLACEHOLDER TESTS (5 Tests)**

**Test File:** `projectsdg.service.spec.ts`

**Current Status:** Placeholder tests documenting service structure and business logic.

## 🚀 Running Tests

### **Run Project SDG Module Tests:**
```bash
npx jest --config test/jest-unit.json src/projectsdg/projectsdg.service.spec.ts
```

## 🧪 Service Structure

### **Expected Methods:**
- `create` - Create new project-SDG relationship
- `findAll` - Retrieve all project-SDG relationships
- `findOne` - Find relationship by ID
- `update` - Update relationship data
- `remove` - Delete relationship
- `assignSDGToProject` - Assign SDG to project
- `removeSDGFromProject` - Remove SDG from project
- `getSDGsByProject` - Get all SDGs for a project
- `getProjectsBySDG` - Get all projects for an SDG

## 🔧 Business Logic

### **Project-SDG Rules:**
- Many-to-many relationship management
- Project and SDG association
- Validation of existing relationships
- Cascade operations when projects/SDGs are deleted
- Relationship integrity checks
- SDG impact measurement
- Project-SDG alignment validation

## 🧪 Integration Points

### **Project Integration:**
- Project validation before SDG assignment
- Project relationship queries
- Project-based filtering
- Project cascade operations
- Project impact measurement

### **SDG Integration:**
- SDG validation before project assignment
- SDG relationship queries
- SDG-based filtering
- SDG cascade operations
- SDG progress tracking

### **Campaign Integration:**
- Campaign SDG alignment
- SDG-based campaign filtering
- Campaign impact measurement
- SDG progress reporting

## 🐛 Error Scenarios

### **Expected Error Handling:**
- Invalid project or SDG IDs
- Duplicate relationship creation
- Database constraint violations
- Orphaned relationship cleanup
- Cascade operation failures
- Invalid SDG alignment
- Impact measurement errors

## 📚 Dependencies

- **PrismaClient:** Database operations
- **ProjectService:** Project validation
- **SDGService:** SDG validation
- **ValidationService:** Data validation

## 🎯 Future Testing Improvements

### **Refactoring Recommendations:**
1. **Use dependency injection** for PrismaClient
2. **Add validation service** integration
3. **Implement relationship event handling**
4. **Add transaction support** for complex operations
5. **Add impact measurement logic**

### **Comprehensive Testing Plan:**
1. **Unit tests** for all public methods
2. **Integration tests** for relationship management
3. **Error handling tests** for various failure scenarios
4. **Performance tests** for large datasets
5. **Cascade operation tests** for deletions
6. **Impact measurement tests** for SDG progress

## 🔧 Manual Testing

### **Testing Relationship Creation:**
1. Create project-SDG relationship
2. Verify relationship is stored in database
3. Check relationship integrity
4. Test duplicate relationship prevention
5. Verify impact measurement

### **Testing Relationship Queries:**
1. Query SDGs by project
2. Query projects by SDG
3. Test relationship filtering
4. Verify relationship counts
5. Test impact calculation

### **Testing Cascade Operations:**
1. Delete project and verify SDG relationships
2. Delete SDG and verify project relationships
3. Test relationship cleanup
4. Verify data consistency
5. Test impact recalculation

## 📋 Test Data Verification

### **Check Project-SDG Relationships:**
```sql
SELECT 
    ps.id,
    p.id as project_id,
    p.name as project_name,
    s.id as sdg_id,
    s.name as sdg_name,
    s.goal_number,
    ps.created_at
FROM "ProjectSDG" ps
JOIN "Project" p ON ps."projectId" = p.id
JOIN "SDG" s ON ps."sdgId" = s.id
ORDER BY ps.created_at DESC;
```

### **Check SDGs by Project:**
```sql
SELECT 
    p.id as project_id,
    p.name as project_name,
    STRING_AGG(s.name, ', ') as sdg_names,
    COUNT(s.id) as sdg_count
FROM "Project" p
LEFT JOIN "ProjectSDG" ps ON p.id = ps."projectId"
LEFT JOIN "SDG" s ON ps."sdgId" = s.id
GROUP BY p.id, p.name
ORDER BY sdg_count DESC;
```

### **Check Projects by SDG:**
```sql
SELECT 
    s.id as sdg_id,
    s.name as sdg_name,
    s.goal_number,
    STRING_AGG(p.name, ', ') as project_names,
    COUNT(p.id) as project_count
FROM "SDG" s
LEFT JOIN "ProjectSDG" ps ON s.id = ps."sdgId"
LEFT JOIN "Project" p ON ps."projectId" = p.id
GROUP BY s.id, s.name, s.goal_number
ORDER BY project_count DESC;
```

### **Check SDG Impact Statistics:**
```sql
SELECT 
    s.name as sdg_name,
    s.goal_number,
    COUNT(DISTINCT p.id) as total_projects,
    COUNT(DISTINCT c.id) as total_campaigns,
    COUNT(DISTINCT v.id) as total_votes,
    s.created_at
FROM "SDG" s
LEFT JOIN "ProjectSDG" ps ON s.id = ps."sdgId"
LEFT JOIN "Project" p ON ps."projectId" = p.id
LEFT JOIN "CampaignProject" cp ON p.id = cp."projectId"
LEFT JOIN "Campaign" c ON cp."campaignId" = c.id
LEFT JOIN "Vote" v ON c.id = v."campaignId"
GROUP BY s.id, s.name, s.goal_number, s.created_at
ORDER BY total_projects DESC;
```

### **Check SDG Progress by Campaign:**
```sql
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    STRING_AGG(DISTINCT s.name, ', ') as sdg_names,
    COUNT(DISTINCT s.id) as sdg_count,
    COUNT(DISTINCT v.id) as vote_count
FROM "Campaign" c
JOIN "CampaignProject" cp ON c.id = cp."campaignId"
JOIN "Project" p ON cp."projectId" = p.id
JOIN "ProjectSDG" ps ON p.id = ps."projectId"
JOIN "SDG" s ON ps."sdgId" = s.id
LEFT JOIN "Vote" v ON c.id = v."campaignId"
GROUP BY c.id, c.name
ORDER BY sdg_count DESC;
```

## 🔍 Project-SDG Testing Scenarios

### **Basic Relationship Operations:**
1. **Assign SDG to project**
2. **Remove SDG from project**
3. **Query SDGs by project**
4. **Query projects by SDG**
5. **Calculate SDG impact**

### **Edge Cases:**
1. **Duplicate relationship prevention**
2. **Invalid ID handling**
3. **Cascade deletion testing**
4. **Relationship validation**
5. **Impact calculation edge cases**

### **SDG Alignment Testing:**
1. **SDG goal validation**
2. **Project-SDG compatibility**
3. **SDG progress tracking**
4. **Impact measurement accuracy**

### **Performance Testing:**
1. **Large dataset relationships**
2. **Complex query performance**
3. **Bulk relationship operations**
4. **Memory usage optimization**
5. **Impact calculation performance**

## 🎯 Project-SDG Specific Features

### **SDG Alignment:**
- Project-SDG goal mapping
- SDG impact assessment
- Goal-based project categorization
- SDG progress tracking

### **Impact Measurement:**
- SDG impact calculation
- Progress measurement
- Impact reporting
- Goal achievement tracking

### **Campaign Integration:**
- Campaign SDG alignment
- SDG-based campaign filtering
- Campaign impact measurement
- SDG progress reporting

### **Reporting and Analytics:**
- SDG progress reports
- Impact analytics
- Goal achievement metrics
- Performance benchmarking

## 🌍 SDG Impact Features

### **Goal Achievement Tracking:**
- SDG goal progress measurement
- Target achievement tracking
- Progress reporting
- Goal validation

### **Impact Assessment:**
- Project impact on SDGs
- Cumulative impact calculation
- Impact verification
- Impact reporting

### **Progress Monitoring:**
- Real-time progress tracking
- Progress alerts
- Milestone tracking
- Performance monitoring

### **Stakeholder Reporting:**
- SDG progress reports
- Impact summaries
- Goal achievement reports
- Performance dashboards

## 📊 SDG Analytics Features

### **Progress Analytics:**
- SDG progress tracking
- Goal achievement rates
- Progress trend analysis
- Performance benchmarking

### **Impact Analytics:**
- Project impact measurement
- Cumulative impact analysis
- Impact distribution
- Impact effectiveness

### **Campaign Analytics:**
- Campaign SDG alignment
- Campaign impact measurement
- SDG-based campaign success
- Campaign performance by SDG

### **Reporting Features:**
- SDG progress dashboards
- Impact summary reports
- Goal achievement reports
- Performance analytics 