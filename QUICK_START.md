# Quick Start Commands

## Setup & Installation

```bash
# Navigate to project
cd d:\projects\ASAD\web

# Install dependencies (already done)
npm install

# Set up environment variables
# Edit .env.local with your DATABASE_URL, SMTP settings, etc.
# Use .env.example as template
```

## Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Reset database (CAUTION: Deletes all data)
npx prisma migrate reset

# Open Prisma Studio (GUI database manager)
npx prisma studio
```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run production build locally
npm start

# Run linter
npm run lint
```

## Testing URLs

Once `npm run dev` is running:

- **Homepage**: http://localhost:3000
- **Login/Signup**: http://localhost:3000/auth
- **Email Verification**: http://localhost:3000/verify-email?token=xxx
- **Payment Form**: http://localhost:3000/payment
- **Dashboard**: http://localhost:3000/dashboard

## API Endpoints

### Authentication

```bash
# Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+880154xxxxxxxx",
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123",
    "instituteId": "buet",
    "joiningSemester": "Spring 2024"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'

# Verify Email
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "verification-token-here"}'
```

### Payments

```bash
# Submit Payment (requires authentication)
curl -X POST http://localhost:3000/api/payments/initial \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "bkash",
    "senderNumber": "01730123456",
    "trxId": "ABC123XYZ",
    "paymentDate": "2024-12-06",
    "paymentTime": "14:30"
  }'
```

## Environment Variables

Create `.env.local`:

```env
# PostgreSQL Database
DATABASE_URL='postgresql://user:password@host:5432/dbname'

# SMTP Email Configuration (Gmail)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Amar Somoy, Amar Desh <noreply@asad.org>"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate with: openssl rand -hex 32"

# Optional: Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## Generate NEXTAUTH_SECRET

```bash
# macOS/Linux
openssl rand -hex 32

# Windows (PowerShell)
[System.Convert]::ToBase64String((1..32 | ForEach-Object {[byte](Get-Random -Maximum 256)}))
```

## Gmail App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Copy the generated password
4. Use in `SMTP_PASS` environment variable

## Project Structure

```
src/
├── app/
│   ├── auth/page.tsx                # Login/Signup UI
│   ├── verify-email/page.tsx        # Email verification
│   ├── payment/page.tsx             # Payment form
│   ├── dashboard/page.tsx           # Dashboard
│   └── api/                         # API endpoints
├── components/auth/                 # Auth components
└── lib/                             # Utilities & config

prisma/
└── schema.prisma                    # Database schema
```

## File Descriptions

| File | Purpose |
|------|---------|
| `src/components/auth/AuthPage.tsx` | Login/Signup page component |
| `src/components/auth/EmailVerificationPage.tsx` | Email verification page |
| `src/components/auth/InitialPaymentPage.tsx` | Payment form page |
| `src/lib/auth.ts` | Authentication utilities |
| `src/lib/email.ts` | Email sending service |
| `src/lib/validations.ts` | Input validation schemas |
| `src/lib/prisma.ts` | Prisma client singleton |
| `prisma/schema.prisma` | Database schema definition |
| `AUTH_DOCUMENTATION.md` | Complete API documentation |
| `IMPLEMENTATION_SUMMARY.md` | Implementation overview |

## Important: Email Setup for Testing

### Gmail with App Password (Recommended)
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="xxxx xxxx xxxx xxxx"  # App password, spaces included
```

### Alternative: Using Mailtrap (for development)
```env
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="your-mailtrap-username"
SMTP_PASS="your-mailtrap-password"
```

## Payment Testing

Use these dummy numbers to test the payment form:

- **bKash**: 01730123456
- **Nagad**: 01829123456
- **Visa**: 4111 1111 1111 1111
- **Mastercard**: 5555 5555 5555 4444

Any date/time in the future is valid.

## Debugging

### Enable Debug Mode
```bash
# For Prisma logging
export DEBUG="prisma:*"
npm run dev

# For Next.js logging
export NODE_DEBUG="next:*"
npm run dev
```

### Check Database
```bash
# Open Prisma Studio
npx prisma studio

# Connect to database directly
psql postgresql://user:password@host:5432/dbname
```

### View Application Logs

Logs are printed to console during development:
- API request/response logs
- Prisma query logs
- Email sending logs

## Troubleshooting Quick Links

1. **Database issues**: See AUTH_DOCUMENTATION.md → Troubleshooting
2. **Email not sending**: Check SMTP credentials in .env
3. **Build errors**: Clear `.next` folder and reinstall dependencies
4. **TypeScript errors**: Run `npm run build` to check

## Performance Tips

1. **Database optimization**
   - Indexes are already set up in schema
   - Use Prisma's select/where for query optimization

2. **Email sending**
   - Consider async processing for bulk emails
   - Implement retry logic for failed emails

3. **Frontend optimization**
   - Components already use Framer Motion for smooth animations
   - Use React.memo for expensive components if needed

## Deployment Checklist

- [ ] DATABASE_URL configured in production environment
- [ ] SMTP credentials set up for email service
- [ ] NEXTAUTH_SECRET generated and set
- [ ] NEXTAUTH_URL points to production domain
- [ ] Google OAuth credentials (optional) configured
- [ ] Build tested: `npm run build`
- [ ] Environment variables not committed to git
- [ ] Security headers configured (CORS, CSP)
- [ ] Rate limiting implemented
- [ ] Monitoring/logging set up

## Useful Commands Reference

```bash
# Project info
npm list                           # List all dependencies

# Formatting & Linting
npx prettier --write .            # Format code
npm run lint                       # Run ESLint

# Database management
npx prisma generate              # Generate Prisma Client
npx prisma db push               # Push schema changes
npx prisma db pull               # Pull schema from database
npx prisma studio                # Open database GUI

# Building
npm run build                     # Build for production
npm start                         # Run production server
npm run dev                       # Run development server

# Cleanup
rm -rf node_modules              # Remove dependencies
npm install                       # Reinstall dependencies
rm -rf .next                      # Clear Next.js cache
```

## Support Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Framer Motion Documentation](https://www.framer.com/motion)
- [Zod Documentation](https://zod.dev)

## Additional Notes

- All components are TypeScript for type safety
- Animations use Framer Motion with smooth cubic-bezier easing
- Color scheme follows the primary color #c8102e throughout
- Mobile-first responsive design approach
- All forms include comprehensive validation
- Email templates are branded and professional
- Database schema supports multi-language and scalability

---

**Last Updated**: December 6, 2024
**Status**: Ready for Development & Testing
