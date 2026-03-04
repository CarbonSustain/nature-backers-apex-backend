# 🧪 Auth Module Testing Guide

This module handles user authentication, JWT token management, and authorization.

## 📊 Test Coverage

### 📝 **PLACEHOLDER TESTS (1 Test)**

**Test File:** `auth.service.spec.ts`

**Current Status:** Placeholder tests documenting service structure and business logic.

## 🚀 Running Tests

### **Run Auth Module Tests:**
```bash
npx jest --config test/jest-unit.json src/auth/auth.service.spec.ts
```

## 🧪 Service Structure

### **Expected Methods:**
- `validateUser` - Validate user credentials
- `login` - User login with JWT generation
- `generateToken` - Generate JWT tokens
- `verifyToken` - Verify JWT token validity
- `refreshToken` - Refresh expired tokens
- `logout` - User logout and token invalidation

## 🔧 Business Logic

### **Authentication Rules:**
- User credentials validation
- JWT token generation and validation
- Password hashing and verification
- Token expiration and refresh
- Session management

## 🧪 Integration Points

### **User Service Integration:**
- User credential validation
- User role and permission checking
- User session management
- User activity tracking

### **Security Integration:**
- JWT token management
- Password hashing (bcrypt)
- Rate limiting for login attempts
- Security headers and CORS

## 🐛 Error Scenarios

### **Expected Error Handling:**
- Invalid credentials
- Expired tokens
- Invalid JWT signatures
- Rate limiting exceeded
- User account lockout

## 📚 Dependencies

- **JWT:** Token generation and validation
- **bcrypt:** Password hashing
- **UserService:** User data access
- **Rate Limiter:** Login attempt limiting

## 🎯 Future Testing Improvements

### **Refactoring Recommendations:**
1. **Use dependency injection** for all dependencies
2. **Extract JWT logic** to separate service
3. **Add rate limiting** service integration
4. **Implement proper error handling** with security logging

### **Comprehensive Testing Plan:**
1. **Unit tests** for all public methods
2. **Security tests** for authentication flows
3. **Token tests** for JWT operations
4. **Rate limiting tests** for login attempts
5. **Integration tests** for user workflows

## 🔧 Manual Testing

### **Testing User Login:**
1. Test login with valid credentials
2. Test login with invalid credentials
3. Verify JWT token generation
4. Test token validation

### **Testing Token Management:**
1. Test token generation
2. Test token verification
3. Test token refresh
4. Test token expiration

### **Testing Security Features:**
1. Test rate limiting
2. Test password hashing
3. Test session management
4. Test logout functionality

## 📋 Test Data Verification

### **Check User Authentication:**
```sql

id,
  business_email,
  password_hash,


FROM "User"
WHERE business_email = '[EMAIL]';
```

### **Check JWT Token Logs:**
```sql
-- If JWT logging is implemented
SELECT 
    id,
    user_id,
    token_type,
    created_at,
    expires_at
FROM jwt_tokens 
WHERE user_id = [USER_ID]
ORDER BY created_at DESC;
``` 
