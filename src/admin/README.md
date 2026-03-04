# 🧪 Admin Module Testing Guide

This module handles admin-specific functionality including data export and administrative operations.

## 📊 Test Coverage

### 📝 **PLACEHOLDER TESTS (5 Tests)**

**Test File:** `export.service.spec.ts`

**Current Status:** Placeholder tests documenting service structure and business logic.

## 🚀 Running Tests

### **Run Admin Module Tests:**
```bash
npx jest --config test/jest-unit.json src/admin/export.service.spec.ts
```

## 🧪 Service Structure

### **Expected Methods:**
- `exportCampaigns` - Export campaign data for admin review
- `exportProjects` - Export project data for admin review
- `exportVotes` - Export vote data for admin review
- `exportUsers` - Export user data for admin review
- `exportAllData` - Export all system data for admin review

## 🔧 Business Logic

### **Admin Export Rules:**
- Admin-only access control
- Data export in various formats (CSV, JSON, Excel)
- Filtering and pagination support
- Secure data handling
- Export history tracking

## 🧪 Integration Points

### **Database Integration:**
- Prisma ORM for data queries
- Complex joins and aggregations
- Data transformation and formatting
- File generation and download

### **Access Control Integration:**
- Admin role verification
- Permission-based data access
- Secure export file handling
- Audit trail for admin actions

## 🐛 Error Scenarios

### **Expected Error Handling:**
- Database connection failures
- Large dataset memory issues
- File generation errors
- Permission/access control errors
- Export format errors

## 📚 Dependencies

- **PrismaClient:** Database operations
- **File System:** Export file management
- **CSV/Excel Libraries:** File format generation
- **AdminAuthGuard:** Access control

## 🎯 Future Testing Improvements

### **Refactoring Recommendations:**
1. **Use dependency injection** for PrismaClient
2. **Extract file generation logic** to separate service
3. **Add interface for export strategies**
4. **Implement proper error handling** with custom exceptions

### **Comprehensive Testing Plan:**
1. **Unit tests** for all public methods
2. **Integration tests** for admin workflows
3. **Security tests** for access control
4. **Performance tests** for large exports
5. **Error handling tests** for various failures

## 🔧 Manual Testing

### **Testing Admin Access:**
1. Test admin-only endpoint access
2. Verify role-based permissions
3. Test unauthorized access attempts
4. Check audit trail logging

### **Testing Data Export:**
1. Export campaign data as admin
2. Verify export file format
3. Check data completeness
4. Test file download security

### **Testing Large Datasets:**
1. Export large datasets
2. Test memory usage
3. Verify performance
4. Check timeout handling

## 📋 Test Data Verification

### **Check Admin User:**
```sql
SELECT 
    id, 
    business_email,
    first_name,
    last_name,
    "roleId"
FROM "User" 
WHERE "roleId" = 1  -- Assuming 1 is admin role
ORDER BY created_at DESC;
```

### **Check Export History:**
```sql
-- If export logging is implemented
SELECT 
    id,
    admin_user_id,
    export_type,
    file_path,
    record_count,
    created_at,
    status
FROM admin_export_logs 
ORDER BY created_at DESC
LIMIT 10;
```

### **Check Admin Actions:**
```sql
-- If admin action logging is implemented
SELECT 
    id,
    admin_user_id,
    action_type,
    target_entity,
    action_details,
    created_at
FROM admin_action_logs 
ORDER BY created_at DESC
LIMIT 10;
```

## 🔐 Security Testing

### **Access Control Testing:**
1. **Test admin-only endpoints** with non-admin users
2. **Verify JWT token validation** for admin routes
3. **Test role-based permissions** for different admin levels
4. **Check audit trail** for admin actions

### **Data Security Testing:**
1. **Test data sanitization** in exports
2. **Verify sensitive data protection**
3. **Test export file access controls**
4. **Check data retention policies**

## 🎯 Admin-Specific Scenarios

### **Campaign Management:**
1. Export campaign data for review
2. Generate campaign reports
3. Monitor campaign performance
4. Audit campaign changes

### **User Management:**
1. Export user data for analysis
2. Monitor user activity
3. Generate user reports
4. Audit user changes

### **System Monitoring:**
1. Export system logs
2. Monitor system performance
3. Generate system reports
4. Audit system changes 