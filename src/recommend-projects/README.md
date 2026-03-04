# Recommend Projects Module

## Overview
The Recommend Projects module provides intelligent project recommendation functionality using Hedera Global Indexer and Verifiable Credentials (VCs). It bridges the gap between Hedera blockchain data and local database storage, enabling dynamic project discovery and management.

## 🎯 Core Functionality

### 1. **Final Recommendations API** (`/final-recommendations`)
- **Purpose**: Processes Hedera documents and creates/updates projects in database
- **Flow**: 
  1. Calls Hedera Global Indexer with search criteria
  2. Processes all returned documents
  3. Extracts basic project info (UUID, status, consensusTimestamp)
  4. Parses location and SDG data from textSearch
  5. Creates or updates projects in database
  6. Manages SDG associations

### 2. **VC Data Retrieval API** (`/get-vc-by-timestamp`)
- **Purpose**: Gets complete VC data and updates project with full details
- **Flow**:
  1. Retrieves full VC from Hedera using consensusTimestamp
  2. Parses JSON document from VC
  3. Extracts credentialSubject data
  4. Updates project with complete VC fields
  5. Manages SDG associations

### 3. **Filters API** (`/filters`)
- **Purpose**: Provides available filter options for recommendations
- **Returns**: Categorized filter options for frontend use

## 📁 File Structure

```
src/recommend-projects/
├── README.md                           # This file
├── recommend-projects.controller.ts    # API endpoints
├── recommend-projects.service.ts       # Business logic
└── recommend-projects.module.ts        # Module configuration
```

## 🔧 API Endpoints

### POST `/recommend-projects/final-recommendations`
**Processes Hedera documents and creates/updates projects**

**Request Body:**
```json
{
  "sdgs": ["no poverty"],
  "funding_target": ["< $10k"],
  "timeframe": ["short"],
  "region": ["asia"],
  "project_type": ["reforestation"],
  "verification": ["verra"]
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Final project recommendations retrieved successfully",
  "data": {
    "message": "Final recommendations processed successfully",
    "criteria": { /* search criteria */ },
    "documentsResponse": [ /* raw Hedera response */ ],
    "processedProjects": [ /* created/updated projects */ ],
    "summary": {
      "totalDocumentsFound": 64,
      "projectsCreated": 5,
      "projectsUpdated": 2,
      "totalProjectsProcessed": 7
    },
    "status": "documents_processed"
  }
}
```

### POST `/recommend-projects/get-vc-by-timestamp`
**Gets full VC data and updates project**

**Request Body:**
```json
{
  "consensusTimestamp": "1734579271.852063379"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "VC retrieved successfully by message ID",
  "data": {
    "id": "1734579271.852063379",
    "uuid": "14ac3297-d7b5-4658-b00f-ba9059d8b338",
    "item": { /* full VC response */ },
    "projectUpdated": {
      "status": "updated",
      "message": "Project updated successfully with full VC data",
      "project": { /* updated project */ },
      "sdgIds": [1, 2]
    }
  }
}
```

### GET `/recommend-projects/filters`
**Gets available filter options**

**Response:**
```json
{
  "statusCode": 200,
  "message": "Project filters fetched successfully",
  "data": {
    "sdgs": [
      { "value": "no poverty", "label": "No Poverty" }
    ],
    "funding_target": [
      { "value": "< $10k", "label": "Under $10,000" }
    ]
  }
}
```

## 🏗️ Service Methods

### Public Methods
- `getFilters()` - Returns filter options from database
- `getFinalRecommendations(criteria)` - Processes Hedera documents
- `getVcByTimestamp(consensusTimestamp)` - Gets full VC data

### Private Helper Methods
- `extractCoordinates()` - Extracts lat/lng from address strings
- `extractSdgNames()` - Parses SDG data from VC format
- `findSdgByName()` - Fuzzy matching for SDG names
- `mapSdgNamesToIds()` - Converts SDG names to database IDs
- `projectExists()` - Checks if project exists by UUID
- `createProjectSdgAssociations()` - Manages SDG relationships
- `parseTextSearch()` - Extracts location from textSearch
- `extractSdgIdsFromText()` - Extracts SDGs from textSearch
- `extractSdgIdsFromVc()` - Extracts SDGs from VC arrays
- `extractLocationFromCenterPoints()` - Parses location from VC

## 🔄 Data Flow

### Final Recommendations Flow
```
1. Client Request → Controller
2. Controller → Service.getFinalRecommendations()
3. Service → IndexerService.getDocumentsByKeywords()
4. Process each document:
   - Extract UUID, status, consensusTimestamp
   - Parse location from textSearch
   - Extract SDG IDs from textSearch
   - Check if project exists
   - Create/Update project in database
   - Manage SDG associations
5. Return summary to client
```

### VC Data Retrieval Flow
```
1. Client Request → Controller
2. Controller → Service.getVcByTimestamp()
3. Service → IndexerService.getVcByMessageId()
4. Parse JSON document from VC
5. Extract credentialSubject data
6. Update project with full VC fields
7. Manage SDG associations
8. Return updated project data
```

## 🧪 Testing

### 📊 Test Coverage

### 📝 **PLACEHOLDER TESTS (1 Test)**

**Test File:** `recommend-projects.service.spec.ts`

**Current Status:** Placeholder tests documenting service structure and business logic.

## 🚀 Running Tests

### **Run Recommend Projects Module Tests:**
```bash
npx jest --config test/jest-unit.json src/recommend-projects/recommend-projects.service.spec.ts
```

## 🧪 Service Structure

### **Expected Methods:**
- `getFilters()` - Returns filter options from database
- `getFinalRecommendations(criteria)` - Processes Hedera documents
- `getVcByTimestamp(consensusTimestamp)` - Gets full VC data

### **Private Helper Methods:**
- `extractCoordinates()` - Extracts lat/lng from address strings
- `extractSdgNames()` - Parses SDG data from VC format
- `findSdgByName()` - Fuzzy matching for SDG names
- `mapSdgNamesToIds()` - Converts SDG names to database IDs
- `projectExists()` - Checks if project exists by UUID
- `createProjectSdgAssociations()` - Manages SDG relationships
- `parseTextSearch()` - Extracts location from textSearch
- `extractSdgIdsFromText()` - Extracts SDGs from textSearch
- `extractSdgIdsFromVc()` - Extracts SDGs from VC arrays
- `extractLocationFromCenterPoints()` - Parses location from VC

## 🔧 Business Logic

### **Recommendation Rules:**
- Projects must have valid UUIDs from Hedera
- Projects can be associated with multiple SDGs
- Location data is extracted from VC textSearch
- SDG mapping uses fuzzy matching for flexibility
- Projects are created/updated based on consensusTimestamp

## 🧪 Integration Points

### **Hedera Integration:**
- Hedera Global Indexer for document retrieval
- VC data parsing and validation
- Consensus timestamp tracking
- Blockchain data synchronization

### **Database Integration:**
- Project records are stored in PostgreSQL
- Project relationships with SDGs
- Filter options from database
- Project status and metadata

## 🐛 Error Scenarios

### **Expected Error Handling:**
- Invalid consensusTimestamp format
- VC parsing failures
- SDG mapping errors
- Database constraint violations
- Hedera API failures
- Location parsing errors

## 📚 Dependencies

- **IndexerService:** Hedera Global Indexer integration
- **PrismaClient:** Database operations
- **Logger:** Logging functionality

## 🎯 Future Testing Improvements

### **Refactoring Recommendations:**
1. **Use dependency injection** for IndexerService and PrismaClient
2. **Extract Hedera logic** to separate service
3. **Add validation service** integration
4. **Implement proper error handling** with custom exceptions

### **Comprehensive Testing Plan:**
1. **Unit tests** for all public methods
2. **Integration tests** for Hedera operations
3. **Error handling tests** for various failure scenarios
4. **Performance tests** for large document processing
5. **SDG mapping tests** for various input formats

## 🔧 Manual Testing

### **Testing Final Recommendations:**
```bash
# Test final recommendations
curl -X POST http://localhost:4000/recommend-projects/final-recommendations \
  -H "Content-Type: application/json" \
  -d '{"sdgs": ["no poverty"]}'
```

### **Testing VC Retrieval:**
```bash
# Test VC retrieval
curl -X POST http://localhost:4000/recommend-projects/get-vc-by-timestamp \
  -H "Content-Type: application/json" \
  -d '{"consensusTimestamp": "1734579271.852063379"}'
```

### **Testing Filters:**
```bash
# Test filters
curl -X GET http://localhost:4000/recommend-projects/filters
```

## 📋 Test Data Verification

### **Check Recommendation Processing:**
```sql
SELECT 
    id, 
    "uniqueId",
    "consensusTimestamp",
    status,
    latitude,
    longitude,
    "createdAt",
    "updatedAt"
FROM "Project" 
WHERE "consensusTimestamp" IS NOT NULL
ORDER BY "createdAt" DESC
LIMIT 10;
```

### **Check SDG Associations:**
```sql
SELECT 
    p.id as project_id,
    p."uniqueId" as project_uuid,
    s.id as sdg_id,
    s.name as sdg_name
FROM "Project" p
JOIN "ProjectSdg" ps ON p.id = ps."projectId"
JOIN "Sdg" s ON ps."sdgId" = s.id
WHERE p."uniqueId" = '[UUID]';
```

### **Check Filter Options:**
```sql
SELECT 
    fc.name as category_name,
    fo.value as option_value,
    fo.label as option_label
FROM "FilterCategory" fc
JOIN "FilterOption" fo ON fc.id = fo."filterCategoryId"
ORDER BY fc.name, fo.value;
```

## 🔍 Error Scenarios

### Common Errors
1. **No VC data found** - Invalid consensusTimestamp
2. **Project not found** - UUID doesn't exist in database
3. **Parse errors** - Invalid JSON in VC documents
4. **SDG mapping failures** - SDG names not found in database
5. **Location parsing errors** - Invalid coordinate format

### Error Handling
- All methods include try-catch blocks
- Detailed error logging with context
- Graceful fallbacks for parsing failures
- Validation of required fields

## 🔗 Dependencies

### Internal Dependencies
- `IndexerService` - Hedera Global Indexer integration
- `PrismaClient` - Database operations
- `Logger` - Logging functionality

### External Dependencies
- `@nestjs/common` - NestJS framework
- `@prisma/client` - Database ORM

## 🚀 Performance Considerations

### Optimization Strategies
1. **Batch Processing** - Process multiple documents efficiently
2. **Database Optimization** - Use indexes on uniqueId and consensusTimestamp
3. **Caching** - Consider caching filter options
4. **Error Recovery** - Continue processing on individual failures

### Monitoring
- Log document processing counts
- Track SDG extraction success rates
- Monitor database operation performance
- Alert on high error rates

## 🔮 Future Improvements

### Planned Enhancements
1. **Caching Layer** - Cache Hedera responses to reduce API calls
2. **Batch Operations** - Process multiple VCs in single request
3. **Advanced Filtering** - More sophisticated search criteria
4. **Real-time Updates** - WebSocket integration for live updates
5. **Analytics Dashboard** - Processing statistics and metrics

### Technical Debt
1. **Type Safety** - Add proper TypeScript interfaces
2. **Validation** - Add request validation decorators
3. **Testing** - Increase unit test coverage
4. **Documentation** - Add JSDoc comments for all methods

## 📊 Database Schema

### Related Tables
- `Project` - Main project data (VC-based structure)
- `ProjectSDG` - Many-to-many relationship with SDGs
- `SDG` - Sustainable Development Goals
- `FilterCategory` - Available filter categories
- `FilterOption` - Individual filter options

### Key Fields
- `Project.uniqueId` - UUID from Hedera (unique constraint)
- `Project.consensusTimestamp` - Hedera consensus timestamp
- `Project.status` - Project status from Hedera
- `Project.latitude/longitude` - Extracted coordinates
- `Project.impactAndRiskSdgs` - SDG impact data

## 🔐 Security Considerations

### Data Validation
- Validate consensusTimestamp format
- Sanitize search criteria
- Validate UUID format
- Check for SQL injection in search terms

### Access Control
- Consider adding authentication for sensitive operations
- Rate limiting for API endpoints
- Input validation and sanitization

## 📝 Logging

### Log Levels
- **INFO** - Processing steps and summaries
- **WARN** - Non-critical errors (parsing failures)
- **ERROR** - Critical errors (database failures)

### Log Context
- Include UUID and consensusTimestamp in logs
- Log processing statistics
- Track SDG extraction success rates
- Monitor performance metrics 