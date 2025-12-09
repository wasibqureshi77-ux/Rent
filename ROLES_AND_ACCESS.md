# User Roles & Access Control System

## Overview
This application implements a three-tier role-based access control system with email verification and admin approval workflows.

## User Roles

### 1. SUPER_ADMIN
**Creation:**
- First user to register automatically becomes SUPER_ADMIN
- Auto-verified and auto-approved (no email verification needed)
- This is Wasib (the client)

**Permissions:**
- Full access to all features
- Can view and manage ALL property owners
- Can approve/revoke access for property owners
- Can view all properties, tenants, and bills across the system
- Access to Admin Users page (`/dashboard/admin/users`)

**Characteristics:**
- `role: 'super_admin'`
- `isVerified: true`
- `isApproved: true`

### 2. PROPERTY_OWNER
**Registration Flow:**
1. User registers via `/register` page
2. System generates verification token (24-hour expiry)
3. Verification email sent to user (currently logged to console)
4. User clicks verification link in email
5. Email is verified (`isVerified: true`)
6. Account status changes to "Pending Approval"
7. SUPER_ADMIN approves the account
8. Approval notification email sent (currently logged to console)
9. User can now login and access the system

**Permissions:**
- Can only access their own data
- Can manage their own:
  - Properties
  - Tenants
  - Meter readings
  - Bills
  - Settings
- Cannot see other owners' data
- Cannot access Admin Users page

**Characteristics:**
- `role: 'owner'`
- `isVerified: true` (after email verification)
- `isApproved: true` (after admin approval)

### 3. RENTER
**Characteristics:**
- No user account
- No login capability
- Stored only as data in the `Tenant` collection
- Managed by property owners

## Authentication Flow

### Registration
```
User submits registration form
  ↓
System checks if first user
  ↓
If first user:
  - Create as SUPER_ADMIN
  - Auto-verify
  - Auto-approve
  - Redirect to login
  
If not first user:
  - Create as PROPERTY_OWNER
  - Generate verification token
  - Send verification email
  - Show "Check your email" message
```

### Email Verification
```
User clicks link in email
  ↓
System validates token
  ↓
If valid:
  - Set isVerified = true
  - Clear verification token
  - Show "Email verified, pending approval" message
  
If invalid/expired:
  - Show error message
```

### Login
```
User submits credentials
  ↓
System validates email/password
  ↓
Check isVerified
  ↓
If not verified:
  - Show "Email not verified" error
  
If verified:
  ↓
  Check isApproved (for non-super_admin)
    ↓
    If not approved:
      - Show "Account pending approval" error
    
    If approved:
      - Create session
      - Redirect to dashboard
```

## Admin Approval Workflow

### For SUPER_ADMIN
1. Navigate to `/dashboard/admin/users`
2. View all property owners with their status:
   - **Verified**: Email verification status
   - **Status**: Approval status (Pending/Approved)
3. Click approve button (✓) to approve user
4. System sends approval notification email
5. User can now login

### Approval Button States
- **Disabled**: User hasn't verified email yet (grayed out)
- **Green Check (✓)**: Click to approve pending user
- **Red X (✗)**: Click to revoke access from approved user

## Database Schema

### User Model
```typescript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: 'super_admin' | 'owner',
  isVerified: Boolean,
  isApproved: Boolean,
  verificationToken: String (optional),
  verificationTokenExpiry: Date (optional),
  settings: {
    fixedWaterBill: Number,
    electricityRatePerUnit: Number,
    currency: String
  },
  timestamps: true
}
```

## Email System

### Current Implementation
Emails are currently logged to the console for development. The system is structured to easily integrate with email services like:
- SendGrid
- Resend
- Nodemailer
- AWS SES

### Email Types

#### 1. Verification Email
**Sent when:** Property owner registers
**Contains:** 
- Verification link with token
- 24-hour expiry notice
**Template location:** `src/lib/email.ts` → `sendVerificationEmail()`

#### 2. Approval Notification
**Sent when:** SUPER_ADMIN approves a property owner
**Contains:**
- Approval confirmation
- Login link
**Template location:** `src/lib/email.ts` → `sendApprovalNotificationEmail()`

## API Endpoints

### Registration
- **POST** `/api/register`
- Creates user with appropriate role
- Sends verification email for property owners
- Returns `requiresVerification` flag

### Email Verification
- **GET** `/api/verify-email?token={token}`
- Validates token and expiry
- Marks user as verified
- Clears verification token

### Admin User Management
- **GET** `/api/admin/users`
  - Returns all non-super_admin users
  - Requires SUPER_ADMIN role
  
- **PATCH** `/api/admin/users`
  - Updates user approval status
  - Sends approval notification email
  - Requires SUPER_ADMIN role

## Security Features

1. **Password Hashing**: bcryptjs with salt rounds
2. **Token Expiry**: Verification tokens expire in 24 hours
3. **Role-Based Access**: Middleware checks user role
4. **Session Management**: JWT-based sessions via NextAuth
5. **Data Isolation**: Property owners can only access their own data

## Environment Variables Required

```env
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000  # or your production URL
```

## Future Enhancements

1. **Email Service Integration**
   - Replace console.log with actual email service
   - Add email templates with branding
   
2. **Resend Verification Email**
   - Add endpoint to resend verification email
   - Add UI button on login page
   
3. **Password Reset**
   - Forgot password flow
   - Reset token generation
   
4. **User Notifications**
   - In-app notifications for approval status
   - Email notifications for important events

## Testing the System

### Test as SUPER_ADMIN
1. Clear database (or ensure no users exist)
2. Register first user
3. Login immediately (no verification needed)
4. Access `/dashboard/admin/users`

### Test as PROPERTY_OWNER
1. Register new user (after super_admin exists)
2. Check console for verification link
3. Click verification link
4. Try to login (should show "pending approval")
5. Login as super_admin
6. Approve the new user
7. Check console for approval email
8. Login as property owner
9. Verify data isolation (can't see other owners' data)

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── register/route.ts          # Registration endpoint
│   │   ├── verify-email/route.ts      # Email verification
│   │   └── admin/
│   │       └── users/route.ts         # Admin user management
│   ├── verify-email/page.tsx          # Verification page
│   ├── register/page.tsx              # Registration page
│   └── dashboard/
│       └── admin/
│           └── users/page.tsx         # Admin users UI
├── lib/
│   ├── auth.ts                        # NextAuth configuration
│   └── email.ts                       # Email utilities
├── models/
│   └── User.ts                        # User schema
└── components/
    └── auth/
        └── RegisterForm.tsx           # Registration form
```
