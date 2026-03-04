# 🧪 User Module Testing Guide

This module handles user management, authentication, and role-based access control.

## 📊 Test Coverage

### 📝 **PLACEHOLDER TESTS (2 Tests)**

**Test File:** `user.service.spec.ts`

**Current Status:** Placeholder tests documenting service structure and business logic.

## 🚀 Running Tests

### **Run User Module Tests:**
```bash
npx jest --config test/jest-unit.json src/user/user.service.spec.ts
```

## 🧪 Service Structure

### **Expected Methods:**
- `create` - Create new users
- `findAll` - Retrieve all users
- `findOne` - Find user by ID
- `update` - Update user data
- `remove` - Delete user
- `findByEmail` - Find user by email
- `getUsersWithRoles` - Get users with role information

## 🔧 Business Logic

### **User Management Rules:**
- Users must have unique email addresses
- Users are assigned roles (admin, user, etc.)
- User data includes business information
- Users can be associated with departments
- User authentication and authorization

## 🧪 Integration Points

### **Authentication Integration:**
- User login and session management
- JWT token generation and validation
- Password hashing and verification
- Role-based access control

### **Database Integration:**
- User records are stored in PostgreSQL
- User relationships with roles and departments
- User activity tracking
- User preferences and settings

## 🐛 Error Scenarios

### **Expected Error Handling:**
- Duplicate email addresses
- Invalid user data
- Authentication failures
- Role assignment errors
- Database constraint violations

## 📚 Dependencies

- **PrismaClient:** Database operations
- **bcrypt:** Password hashing
- **JWT:** Token generation and validation
- **RoleService:** Role management

## 🎯 Future Testing Improvements

### **Refactoring Recommendations:**
1. **Use dependency injection** for PrismaClient
2. **Extract authentication logic** to separate service
3. **Add validation service** integration
4. **Implement proper error handling** with custom exceptions

### **Comprehensive Testing Plan:**
1. **Unit tests** for all public methods
2. **Authentication tests** for login/logout
3. **Authorization tests** for role-based access
4. **Security tests** for password handling
5. **Integration tests** for user workflows

## 🔧 Manual Testing

### **Testing User Creation:**
1. Create user with valid data
2. Verify user is stored in database
3. Check role assignment
4. Verify email uniqueness

### **Testing Authentication:**
1. Test user login with valid credentials
2. Test login with invalid credentials
3. Verify JWT token generation
4. Test token validation

### **Testing Role-Based Access:**
1. Test admin user permissions
2. Test regular user permissions
3. Verify role-based API access
4. Test permission escalation

## 📋 Test Data Verification

### **Check User Data:**
```sql
SELECT 
    id, 
    business_email,
    first_name,
    last_name,
    "roleId",
    "departmentId",
    created_at
FROM "User" 
ORDER BY created_at DESC
LIMIT 10;
```

### **Check User-Role Relationships:**
```sql
SELECT 
    u.id,
    u.business_email,
    u.first_name,
    u.last_name,
    r.name as role_name
FROM "User" u
JOIN "Role" r ON u."roleId" = r.id
ORDER BY u.created_at DESC;
```

### **Check User-Department Relationships:**
```sql
SELECT 
    u.id,
    u.business_email,
    u.first_name,
    u.last_name,
    d.name as department_name
FROM "User" u
JOIN "Department" d ON u."departmentId" = d.id
ORDER BY u.created_at DESC;
``` 