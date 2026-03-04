# 🧪 Email Module Testing Guide

This module handles email sending functionality for campaign notifications and user communications.

## 📊 Test Coverage

### 📝 **PLACEHOLDER TESTS (1 Test)**

**Test File:** `send-email.service.spec.ts`

**Current Status:** Placeholder tests documenting service structure and business logic.

## 🚀 Running Tests

### **Run Email Module Tests:**
```bash
npx jest --config test/jest-unit.json src/email/send-email.service.spec.ts
```

## 🧪 Service Structure

### **Expected Methods:**
- `sendEmailsByCampaign` - Send emails for campaign status changes
- `sendEmail` - Send individual emails
- `sendBulkEmails` - Send emails to multiple recipients
- `sendCampaignActivationEmail` - Send campaign activation notifications
- `sendCampaignEndEmail` - Send campaign end notifications

## 🔧 Business Logic

### **Email Rules:**
- Emails are sent for campaign status transitions
- Email templates are used for consistent messaging
- Email delivery tracking and logging
- Email validation and sanitization
- Rate limiting for email sending

## 🧪 Integration Points

### **Email Service Integration:**
- SMTP server configuration
- Email template management
- Email delivery tracking
- Email queue management

### **Campaign Integration:**
- Campaign status change notifications
- User vote confirmations
- Campaign activation emails
- Campaign completion emails

## 🐛 Error Scenarios

### **Expected Error Handling:**
- SMTP server failures
- Invalid email addresses
- Email template errors
- Rate limiting exceeded
- Email delivery failures

## 📚 Dependencies

- **SMTP Client:** Email delivery
- **Template Engine:** Email template processing
- **Queue Service:** Email queuing
- **Logging Service:** Email delivery logging

## 🎯 Future Testing Improvements

### **Refactoring Recommendations:**
1. **Use dependency injection** for email clients
2. **Extract template logic** to separate service
3. **Add email validation** service integration
4. **Implement proper error handling** with retry logic

### **Comprehensive Testing Plan:**
1. **Unit tests** for all public methods
2. **Integration tests** for email delivery
3. **Template tests** for email content
4. **Error handling tests** for delivery failures
5. **Performance tests** for bulk email sending

## 🔧 Manual Testing

### **Testing Email Sending:**
1. Trigger campaign status change
2. Verify email is sent to correct recipients
3. Check email content and formatting
4. Verify email delivery tracking

### **Testing Email Templates:**
1. Test different email templates
2. Verify template variable substitution
3. Check email formatting and styling
4. Test email localization

### **Testing Error Scenarios:**
1. Test with invalid email addresses
2. Test SMTP server failures
3. Test rate limiting scenarios
4. Verify error logging and reporting

## 📋 Test Data Verification

### **Check Email Logs:**
```sql
-- If email logging is implemented
SELECT 
    id,
    recipient_email,
    subject,
    status,
    sent_at,
    error_message
FROM email_logs 
ORDER BY sent_at DESC
LIMIT 10;
```

### **Check Campaign Email Status:**
```sql
SELECT 
    c.id,
    c.name,
    c."emailSubject",
    c."emailBody",
    c."campaignStatusId"
FROM "Campaign" c
WHERE c."emailSubject" IS NOT NULL
ORDER BY c.created_at DESC;
``` 