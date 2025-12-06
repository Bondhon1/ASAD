# Authentication System Documentation

## Overview
The Amar Somoy, Amar Desh (ASAD) platform includes a complete authentication and registration system with email verification and initial payment processing.

## Features Implemented

### 1. **Beautiful Login/Signup UI** ✅
- Responsive design for mobile and PC
- Animated components using Framer Motion
- Smooth transitions between login and signup modes
- Follows the homepage theme (Primary color: #c8102e)
- Form validation with user-friendly error messages

### 2. **User Registration (Signup)** ✅
- Multi-field form: Full Name, Email, Phone, Institute, Password
- Phone number validation for Bangladesh format
- Password strength requirements: min 8 chars, 1 uppercase, 1 number
- Duplicate email/phone prevention
- Creates user in APPLICANT status
- Generates unique email verification token

### 3. **Email Verification** ✅
- Link-based verification (24-hour expiry)
- Beautiful verification page with status indicators
- Automatic email sending with branded HTML template
- Token validation and user status update
- Redirect to payment page after successful verification

### 4. **Initial Payment Processing** ✅
- 30 BDT payment form with 4 payment methods:
  - bKash (dummy: 01730123456)
  - Nagad (dummy: 01829123456)
  - Visa (dummy: 4111 1111 1111 1111)
  - Mastercard (dummy: 5555 5555 5555 4444)
- Required fields: Sender Number, Transaction ID, Payment Date, Payment Time
- Copy-to-clipboard functionality for payment numbers
- Stores payment in PENDING status for admin verification
- Beautiful success page with 24-hour verification notice

### 5. **Login System** ✅
- Email and password authentication
- Email verification requirement check
- Payment verification requirement check
- User status validation (checks for BANNED users)
- Secure password comparison with bcrypt

### 6. **Database Schema** ✅
Complete Prisma schema with:
- User management with authentication fields
- Institute and committee structure
- Application tracking
- Volunteer profiles and ranking
- Task and submission management
- Donation system
- Social features (posts, messaging, friends)
- Payment tracking
- Audit logging

## File Structure

### Components
```
src/components/auth/
├── AuthPage.tsx           # Login/Signup page
├── EmailVerificationPage.tsx  # Email verification page
└── InitialPaymentPage.tsx     # Payment form page
```

### Pages
```
src/app/
├── auth/page.tsx           # /auth route
├── verify-email/page.tsx   # /verify-email route
├── payment/page.tsx        # /payment route
└── dashboard/page.tsx      # /dashboard route (placeholder)
```

### API Endpoints
```
src/app/api/
├── auth/
│   ├── signup/route.ts     # POST /api/auth/signup
│   ├── login/route.ts      # POST /api/auth/login
│   └── verify-email/route.ts # POST /api/auth/verify-email
└── payments/
    └── initial/route.ts    # POST /api/payments/initial
```

### Utilities
```
src/lib/
├── auth.ts              # Password hashing, token generation
├── email.ts             # Email sending services
└── validations.ts       # Zod schemas for validation
```

## Setup Instructions

### 1. Environment Variables
Create a `.env.local` file:

```env
# Database
DATABASE_URL='postgresql://user:password@host:port/dbname'

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"  # For Gmail: Use App Password
SMTP_FROM="Amar Somoy, Amar Desh <noreply@asad.org>"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with: openssl rand -hex 32"

# OAuth (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 2. Database Setup

Push the Prisma schema to your database:

```bash
npx prisma db push
```

Generate Prisma Client:

```bash
npx prisma generate
```

### 3. Install Dependencies

```bash
npm install
```

All required packages are already in package.json:
- `@prisma/client` - Database ORM
- `next-auth` - Authentication
- `bcryptjs` - Password hashing
- `nodemailer` - Email sending
- `zod` - Schema validation
- `framer-motion` - Animations
- `react-hook-form` - Form handling

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/auth` to see the login/signup page.

## User Flow

```
1. User visits /auth
   ↓
2. Clicks "Sign Up" and fills form
   ↓
3. Submits form → POST /api/auth/signup
   ↓
4. Receives verification email
   ↓
5. Clicks verification link → /verify-email?token=xxx
   ↓
6. POST /api/auth/verify-email
   ↓
7. Redirected to /payment
   ↓
8. Fills payment form (30 BDT)
   ↓
9. Submits → POST /api/payments/initial
   ↓
10. Payment stored as PENDING (admin verifies)
    ↓
11. User can login after admin verification
```

## API Endpoints

### POST /api/auth/signup
Create a new user account.

**Request:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+880154xxxxxxxx",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123",
  "instituteId": "buet",
  "joiningSemester": "Spring 2024"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Signup successful. Please check your email for verification link.",
  "userId": "clxx..."
}
```

### POST /api/auth/verify-email
Verify user's email address.

**Request:**
```json
{
  "token": "verification-token-from-email"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "email": "john@example.com"
}
```

### POST /api/auth/login
Authenticate user.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "userId": "clxx...",
  "email": "john@example.com",
  "status": "OFFICIAL"
}
```

### POST /api/payments/initial
Submit initial 30 BDT payment.

**Request:**
```json
{
  "paymentMethod": "bkash",
  "senderNumber": "01730123456",
  "trxId": "ABC123XYZ",
  "paymentDate": "2024-12-06",
  "paymentTime": "14:30"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Payment submitted successfully. Admin will verify within 24 hours.",
  "paymentId": "clxx..."
}
```

## User Statuses

- `APPLICANT` - Initial status after signup
- `INTERVIEW_SCHEDULED` - After email verification, before interview
- `INTERVIEW_PASSED` - After successful interview
- `OFFICIAL` - After payment verification (full access)
- `INACTIVE` - Account suspended temporarily
- `BANNED` - Account permanently suspended

## Payment Statuses

- `PENDING` - Submitted, awaiting admin verification
- `VERIFIED` - Admin approved, user can login
- `REJECTED` - Admin rejected, user can retry

## Validation Rules

### Phone Number
- Format: Bangladesh number
- Patterns: `+880154xxxxxxxx` or `01554xxxxxxxx`

### Password
- Minimum 8 characters
- Must contain at least 1 uppercase letter
- Must contain at least 1 number

### Email
- Valid email format
- Unique in database

### Payment Fields
- **Sender Number**: Digits only
- **Transaction ID**: Non-empty string
- **Payment Date**: Valid date format
- **Payment Time**: HH:MM format

## Security Features

- ✅ Passwords hashed with bcryptjs (salt rounds: 10)
- ✅ Email verification tokens with 24-hour expiry
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS protection (Next.js built-in)
- ✅ CORS headers on API routes
- ✅ Rate limiting ready (implement with middleware)

## Next Steps (Not Yet Implemented)

1. **NextAuth.js Integration**
   - Google OAuth implementation
   - Session management
   - JWT tokens

2. **Admin Dashboard**
   - Payment verification interface
   - Application management
   - Interview scheduling

3. **Email Templates**
   - Dynamic branding
   - Multi-language support

4. **Enhanced Security**
   - Two-factor authentication
   - IP-based rate limiting
   - Payment gateway integration (live bKash/Nagad)

5. **Notifications**
   - Push notifications
   - SMS notifications
   - In-app notifications

## Testing Credentials

When testing locally, you can use these dummy payment numbers:

| Method | Number |
|--------|--------|
| bKash | 01730123456 |
| Nagad | 01829123456 |
| Visa | 4111 1111 1111 1111 |
| Mastercard | 5555 5555 5555 4444 |

**Test Account:**
- Email: test@example.com
- Password: TestPass123
- Phone: +880154xxxxxxxx

## Troubleshooting

### Email Not Sending
- Verify SMTP credentials in `.env`
- For Gmail: Use [App Password](https://myaccount.google.com/apppasswords)
- Check spam folder
- Enable "Less secure apps" if using personal Gmail

### Database Connection Error
- Verify DATABASE_URL format
- Check network access rules
- Ensure database is running
- Test connection with: `npx prisma db execute --stdin < test.sql`

### Payment Verification
- Transactions are stored in PENDING status
- Admin must verify manually
- Check InitialPayment table in database

## Support

For issues or questions, please contact:
- GitHub Issues: [Project Repository]
- Email: support@asad.org
