# 🧪 Indexer Module Testing Guide

This module handles data indexing and search functionality for the application.

## 📊 Test Coverage

### 📝 **PLACEHOLDER TESTS (1 Test)**

**Test File:** `indexer.service.spec.ts`

**Current Status:** Placeholder tests documenting service structure and business logic.

## 🚀 Running Tests

### **Run Indexer Module Tests:**
```bash
npx jest --config test/jest-unit.json src/indexer/indexer.service.spec.ts
```

## 🧪 Service Structure

### **Expected Methods:**
- `indexCampaigns` - Index campaign data for search
- `indexProjects` - Index project data for search
- `indexUsers` - Index user data for search
- `searchCampaigns` - Search campaigns
- `searchProjects` - Search projects
- `rebuildIndex` - Rebuild all indexes
- `updateIndex` - Update specific index entries

## 🔧 Business Logic

### **Indexing Rules:**
- Full-text search indexing
- Data normalization and tokenization
- Index optimization and maintenance
- Search result ranking and relevance
- Index synchronization with database

## 🧪 Integration Points

### **Search Engine Integration:**
- Elasticsearch or similar search engine
- Index management and optimization
- Search query processing
- Result ranking and filtering

### **Database Integration:**
- Data extraction for indexing
- Index synchronization
- Search result mapping
- Index metadata tracking

## 🐛 Error Scenarios

### **Expected Error Handling:**
- Search engine connection failures
- Index corruption or corruption
- Large dataset indexing timeouts
- Search query syntax errors
- Index synchronization failures

## 📚 Dependencies

- **Search Engine:** Elasticsearch or similar
- **PrismaClient:** Database operations
- **Index Management:** Index lifecycle management
- **Search Query Parser:** Query processing

## 🎯 Future Testing Improvements

### **Refactoring Recommendations:**
1. **Use dependency injection** for search engine client
2. **Extract search logic** to separate service
3. **Add index monitoring** service integration
4. **Implement proper error handling** with retry logic

### **Comprehensive Testing Plan:**
1. **Unit tests** for all public methods
2. **Integration tests** for search engine
3. **Performance tests** for large datasets
4. **Error handling tests** for various failures
5. **Search accuracy tests** for result relevance

## 🔧 Manual Testing

### **Testing Index Creation:**
1. Create indexes for different data types
2. Verify index structure and mapping
3. Test index optimization
4. Check index metadata

### **Testing Search Functionality:**
1. Test search queries
2. Verify search results
3. Test result ranking
4. Check search performance

### **Testing Index Synchronization:**
1. Update database records
2. Verify index updates
3. Test index consistency
4. Check synchronization performance

## 📋 Test Data Verification

### **Check Index Status:**
```bash
# Check Elasticsearch indices
curl -X GET "localhost:9200/_cat/indices?v"
```

### **Check Search Results:**
```bash
# Test search query
curl -X GET "localhost:9200/campaigns/_search?q=test"
```

### **Check Index Health:**
```bash
# Check cluster health
curl -X GET "localhost:9200/_cluster/health"
``` 