# 🧪 SDG Module Testing Guide

This module handles Sustainable Development Goals (SDGs) management and tracking for the platform.

## 📊 Test Coverage

### 📝 **PLACEHOLDER TESTS (5 Tests)**

**Test File:** `sdg.service.spec.ts`

**Current Status:** Placeholder tests documenting service structure and business logic.

## 🚀 Running Tests

### **Run SDG Module Tests:**
```bash
npx jest --config test/jest-unit.json src/sdg/sdg.service.spec.ts
```

## 🧪 Service Structure

### **Expected Methods:**
- `create` - Create new SDG
- `findAll` - Retrieve all SDGs
- `findOne` - Find SDG by ID
- `update` - Update SDG data
- `remove` - Delete SDG
- `getProjectsBySDG` - Get projects by SDG
- `getSDGProgress` - Get SDG progress
- `validateSDGGoalNumber` - Validate SDG goal number uniqueness

## 🔧 Business Logic

### **SDG Rules:**
- SDG goal number must be unique (1-17)
- SDG can be associated with multiple projects
- SDG deletion affects project relationships
- SDG progress tracking and measurement
- SDG target validation
- SDG metadata management

## 🧪 Integration Points

### **Project Integration:**
- SDG assignment to projects
- Project filtering by SDG
- SDG-based project queries
- Project cascade operations

### **Campaign Integration:**
- Campaign SDG alignment
- SDG-based campaign filtering
- Campaign impact measurement
- SDG progress reporting

### **Progress Tracking Integration:**
- SDG progress measurement
- Target achievement tracking
- Progress reporting
- Impact assessment

## 🐛 Error Scenarios

### **Expected Error Handling:**
- Duplicate SDG goal numbers
- Invalid SDG data
- Database constraint violations
- Cascade deletion failures
- Orphaned relationship cleanup
- Invalid progress calculations
- Target validation errors

## 📚 Dependencies

- **PrismaClient:** Database operations
- **ValidationService:** Data validation
- **ProjectService:** Project relationship management
- **CampaignService:** Campaign relationship management

## 🎯 Future Testing Improvements

### **Refactoring Recommendations:**
1. **Use dependency injection** for PrismaClient
2. **Add validation service** integration
3. **Implement SDG event handling**
4. **Add transaction support** for complex operations
5. **Add progress tracking logic**

### **Comprehensive Testing Plan:**
1. **Unit tests** for all public methods
2. **Integration tests** for relationship management
3. **Error handling tests** for various failure scenarios
4. **Performance tests** for large datasets
5. **Cascade operation tests** for deletions
6. **Progress tracking tests** for SDG measurement

## 🔧 Manual Testing

### **Testing SDG Creation:**
1. Create new SDG
2. Verify SDG is stored in database
3. Check SDG goal number uniqueness
4. Test SDG metadata
5. Verify SDG validation

### **Testing SDG Queries:**
1. Query all SDGs
2. Query SDG by ID
3. Test SDG filtering
4. Verify SDG relationships
5. Test SDG statistics

### **Testing Progress Tracking:**
1. Update SDG progress
2. Verify progress calculation
3. Test target validation
4. Check progress reporting
5. Verify impact measurement

## 📋 Test Data Verification

### **Check All SDGs:**
```sql
SELECT 
    s.id,
    s.name,
    s.goal_number,
    s.description,
    s.targets,
    s.created_at,
    s.updated_at
FROM "SDG" s
ORDER BY s.goal_number;
```

### **Check SDGs with Projects:**
```sql
SELECT 
    s.id as sdg_id,
    s.name as sdg_name,
    s.goal_number,
    COUNT(p.id) as project_count,
    STRING_AGG(p.name, ', ') as project_names
FROM "SDG" s
LEFT JOIN "ProjectSDG" ps ON s.id = ps."sdgId"
LEFT JOIN "Project" p ON ps."projectId" = p.id
GROUP BY s.id, s.name, s.goal_number
ORDER BY s.goal_number;
```

### **Check SDG Progress:**
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
ORDER BY s.goal_number;
```

### **Check SDG Impact by Campaign:**
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

### **Check SDG Target Achievement:**
```sql
SELECT 
    s.name as sdg_name,
    s.goal_number,
    s.targets,
    COUNT(DISTINCT p.id) as projects_contributing,
    COUNT(DISTINCT c.id) as campaigns_involved,
    COUNT(DISTINCT v.id) as total_votes
FROM "SDG" s
LEFT JOIN "ProjectSDG" ps ON s.id = ps."sdgId"
LEFT JOIN "Project" p ON ps."projectId" = p.id
LEFT JOIN "CampaignProject" cp ON p.id = cp."projectId"
LEFT JOIN "Campaign" c ON cp."campaignId" = c.id
LEFT JOIN "Vote" v ON c.id = v."campaignId"
GROUP BY s.id, s.name, s.goal_number, s.targets
ORDER BY s.goal_number;
```

## 🔍 SDG Testing Scenarios

### **Basic SDG Operations:**
1. **Create SDG**
2. **Update SDG**
3. **Delete SDG**
4. **Query SDGs**
5. **Validate SDG data**

### **Progress Tracking Testing:**
1. **Update SDG progress**
2. **Calculate progress metrics**
3. **Validate target achievement**
4. **Generate progress reports**
5. **Track impact measurement**

### **Relationship Testing:**
1. **SDG-project relationships**
2. **SDG-campaign relationships**
3. **SDG-progress relationships**
4. **Relationship cascade operations**

### **Edge Cases:**
1. **Duplicate SDG goal numbers**
2. **Invalid SDG data**
3. **Cascade deletion testing**
4. **Progress calculation errors**
5. **Orphaned relationship handling**

### **Performance Testing:**
1. **Large SDG datasets**
2. **Complex relationship queries**
3. **Bulk SDG operations**
4. **Memory usage optimization**
5. **Progress calculation performance**

## 🎯 SDG-Specific Features

### **Goal Management:**
- SDG goal tracking (1-17)
- Goal target validation
- Goal progress measurement
- Goal achievement reporting

### **Progress Tracking:**
- SDG progress calculation
- Target achievement tracking
- Progress trend analysis
- Impact measurement

### **Project Alignment:**
- Project-SDG mapping
- SDG-based project filtering
- Project impact assessment
- SDG contribution tracking

### **Campaign Integration:**
- Campaign SDG alignment
- SDG-based campaign filtering
- Campaign impact measurement
- SDG progress reporting

## 🌍 SDG Impact Features

### **Goal Achievement:**
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