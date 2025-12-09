# Enhanced Auth & Access Control System

## Overview
This document describes the complete authentication and authorization system with status-based workflows and theme preferences.

## User Model

### Fields
```typescript
{
  _id: ObjectId,
  name: string,
  email: string (unique),
  password: string (hashed),
  role: "SUPER_ADMIN" | "PROPERTY_OWNER",
  status: "PENDING_EMAIL_VERIFICATION" | "PENDING_APPROVAL" | "ACTIVE" | "REJECTED" | "SUSPENDED",
  emailVerifiedAt?: Date,
  verificationToken?: string,
  verificationTokenExpiry?: Date,
  themePreference: "light" | "dark" | "system",
  phone?: string,
  propertyName?: string,
  settings: {
    fixedWaterBill: number,
    electricityRatePerUnit: number,
    currency: string
  },
  createdAt: Date,
  updatedAt: Date
}
```

## User Status Flow

### Status Transitions
```
PENDING_EMAIL_VERIFICATION
  ↓ (email verified)
PENDING_APPROVAL
  ↓ (admin approves)
ACTIVE
  ↓ (admin can change to)
SUSPENDED or REJECTED
```

## Authentication Flows

### 1. Property Owner Registration

**Endpoint:** `POST /api/auth/register-owner`

**Request Body:**
```json
{
  "name": "John Owner",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "phone": "9876543210" (optional),
  "propertyName": "My PG" (optional)
}
```

**Process:**
1. Validates input (password match, email format, etc.)
2. Checks if email already exists
3. Hashes password
4. Checks if first user:
   - **First User:** Creates as SUPER_ADMIN with status ACTIVE
   - **Subsequent Users:** Creates as PROPERTY_OWNER with status PENDING_EMAIL_VERIFICATION
5. Generates verification token (24-hour expiry)
6. Sends verification email
7. Returns success message

**Response:**
```json
{
  "message": "Registration successful! Please check your email to verify your account.",
  "userId": "...",
  "requiresVerification": true
}
```

### 2. Email Verification

**Endpoint:** `GET /api/auth/verify-email?token={token}`

**Process:**
1. Validates token and expiry
2. Updates user:
   - Sets `emailVerifiedAt` to current date
   - Changes `status` to PENDING_APPROVAL
   - Clears verification token
3. Returns success message

**UI:** `/verify-email?token={token}`
- Shows loading state while verifying
- Displays success or error message
- Provides link to login page

### 3. Admin Approval

**Endpoints:**

#### Get Property Owners
`GET /api/admin/property-owners?status=PENDING_APPROVAL`

Returns list of property owners filtered by status (optional).

#### Approve Owner
`PATCH /api/admin/property-owners/:id/approve`

**Process:**
1. Validates user is SUPER_ADMIN
2. Checks user has verified email
3. Sets status to ACTIVE
4. Sends approval notification email
5. Returns success

#### Reject Owner
`PATCH /api/admin/property-owners/:id/reject`

Sets status to REJECTED.

**UI:** `/dashboard/admin/users`
- View all property owners
- Filter by status
- Approve/Reject buttons
- Shows verification and approval status

### 4. Login

**Endpoint:** `POST /api/auth/[...nextauth]` (via NextAuth)

**Process:**
1. Validates email and password
2. Checks user status:
   - **PENDING_EMAIL_VERIFICATION:** "Please verify your email address"
   - **PENDING_APPROVAL:** "Your account is awaiting admin approval"
   - **REJECTED:** "Your account has been rejected"
   - **SUSPENDED:** "Your account has been suspended"
   - **ACTIVE:** Proceed with login
3. Creates session with:
   - User ID
   - Role
   - Theme preference
4. Redirects to dashboard

**UI:** `/login`
- Email and password fields
- Clear error messages for each status
- Link to registration page

### 5. Logout

**Process:**
- Calls `signOut({ callbackUrl: '/login' })`
- Clears session cookie
- Redirects to login page

## Theme System

### Theme Preferences
- **light:** Always use light theme
- **dark:** Always use dark theme
- **system:** Follow system preference

### Implementation

#### ThemeProvider
Located at `src/components/providers/ThemeProvider.tsx`

**Features:**
- Detects system preference
- Syncs with user preference from session
- Stores in localStorage for non-logged-in users
- Updates API when user changes theme
- Listens to system theme changes

#### ThemeToggle Component
Located at `src/components/ui/ThemeToggle.tsx`

**Features:**
- Dropdown with 3 options (Light, Dark, System)
- Shows current selection
- Updates immediately on change
- Persists to database if logged in

#### API Endpoints

**Get Profile:**
`GET /api/user/profile`

Returns user profile including `themePreference`.

**Update Profile:**
`PUT /api/user/profile`

```json
{
  "themePreference": "dark"
}
```

Updates user's theme preference.

### Usage

1. **In Root Layout:**
```tsx
<ThemeProvider>
  {children}
</ThemeProvider>
```

2. **In Components:**
```tsx
import { useTheme } from '@/components/providers/ThemeProvider';

const { theme, setTheme, resolvedTheme } = useTheme();
```

3. **In Sidebar:**
```tsx
<ThemeToggle />
```

## Protected Routes

### Middleware
All dashboard routes require authentication.

### Role-Based Access
- **SUPER_ADMIN:** Access to all routes including `/dashboard/admin/*`
- **PROPERTY_OWNER:** Access to own data only, no admin routes

### Data Isolation
All API endpoints filter by `ownerId` to ensure property owners only see their own data.

## Security Features

1. **Password Hashing:** bcryptjs with 10 salt rounds
2. **Email Verification:** Token-based with 24-hour expiry
3. **Status-Based Access:** Multiple checks before allowing login
4. **Role-Based Authorization:** Middleware and API-level checks
5. **Data Isolation:** Owner ID filtering on all queries
6. **Session Management:** JWT-based via NextAuth

## Email System

### Current Implementation
Emails are logged to console for development.

### Email Types

1. **Verification Email**
   - Sent on registration
   - Contains verification link
   - 24-hour expiry notice

2. **Approval Notification**
   - Sent when admin approves account
   - Contains login link

### Production Integration
Replace console.log in `src/lib/email.ts` with actual email service (SendGrid, Resend, etc.).

## Testing Workflows

### Test SUPER_ADMIN Creation
1. Clear database
2. Register first user
3. Verify status is ACTIVE
4. Login immediately
5. Access admin panel

### Test Property Owner Flow
1. Register new user
2. Check console for verification link
3. Click verification link
4. Verify status changes to PENDING_APPROVAL
5. Try to login (should show "awaiting approval")
6. Login as super admin
7. Approve the user
8. Check console for approval email
9. Login as property owner
10. Verify access to dashboard

### Test Theme System
1. Login as any user
2. Click theme toggle in sidebar
3. Select different theme
4. Verify immediate UI change
5. Refresh page
6. Verify theme persists
7. Check database for updated preference

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register-owner/route.ts
│   │   │   ├── verify-email/route.ts
│   │   │   └── [...nextauth]/route.ts
│   │   ├── admin/
│   │   │   └── property-owners/
│   │   │       ├── route.ts
│   │   │       └── [id]/
│   │   │           ├── approve/route.ts
│   │   │           └── reject/route.ts
│   │   └── user/
│   │       └── profile/route.ts
│   ├── verify-email/page.tsx
│   ├── register/page.tsx
│   ├── login/page.tsx
│   └── dashboard/
│       └── admin/
│           └── users/page.tsx
├── components/
│   ├── auth/
│   │   └── RegisterForm.tsx
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   └── ThemeProvider.tsx
│   ├── ui/
│   │   └── ThemeToggle.tsx
│   └── layout/
│       └── Sidebar.tsx
├── lib/
│   ├── auth.ts
│   └── email.ts
├── models/
│   └── User.ts
└── types/
    └── next-auth.d.ts
```

## Environment Variables

```env
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

## Future Enhancements

1. **Password Reset Flow**
2. **Resend Verification Email**
3. **2FA Authentication**
4. **Email Service Integration**
5. **Audit Logs**
6. **User Activity Tracking**
7. **Advanced Theme Customization**
