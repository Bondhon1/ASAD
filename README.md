# Amar Somoy, Amar Desh (ASAD) - Volunteer Management Platform

A comprehensive volunteer management and activity platform for "Amar Somoy, Amar Desh" organization built with Next.js, TypeScript, Prisma, and PostgreSQL.

## 🌟 Overview

ASAD is a full-featured volunteer management system that handles volunteer registration, task management, donations, social interactions, and administrative oversight. The platform supports multiple user roles from public visitors to administrators, with a complete authentication system, payment processing, and real-time notifications.

## 🚀 Key Features

### **Authentication & User Management**
- ✅ Secure signup/login with email verification
- ✅ Resend verification email with rate limiting (5 attempts max, 2-minute cooldown)
- ✅ Password reset functionality
- ✅ Google OAuth integration
- ✅ Role-based access control (Developer, Admin, HR, Secretaries, Volunteers)
- ✅ Cloudflare Turnstile bot protection

### **Volunteer Registration Flow**
1. **Initial Application** - 30 BDT fee with email verification
2. **Interview Scheduling** - HR sets interview dates for selected applicants
3. **Official Registration** - 170 BDT fee for ID card and development costs
4. **Volunteer Activation** - Full platform access with assigned Volunteer ID

### **Payment System**
- bKash and Nagad integration
- Initial payment (30 BDT) for application
- Final payment (170 BDT) for official volunteer status
- Admin approval workflow for all payments
- Transaction tracking and verification

### **Task Management**
- Task creation by Secretaries and Admins
- Optional (points only) vs Mandatory (points ± based on completion)
- Multiple input types: Yes/No, Text-based, Image-based
- Task submission and approval system
- Points awarded upon completion
- Expiry dates with automated status updates

### **Donation System**
- Public donation form for Project Alokdhara
- Volunteer donation tracking
- Admin approval workflow
- Payment method support (bKash, Nagad)
- Points rewards for volunteer donations

### **Social Features**
- Friend requests and connections
- News feed with posts, reactions, and comments
- Real-time chat system (Ably integration)
- Follow/unfollow functionality
- Post visibility based on follower relationships

### **Ranking & Points System**
- Dynamic point calculation based on activities
- 10-tier ranking system (Helper to President)
- Automatic rank updates based on point thresholds
- Points earned through tasks, donations, and participation
- Point history tracking

### **HR Management**
- Interview scheduling with Google Calendar integration
- Applicant approval workflow
- Volunteer ID assignment
- Leave (Chuti) management
- User ban/unban capabilities

### **Administrative Tools**
- Database management dashboard
- Manual point and rank adjustments
- Volunteer analytics and statistics
- Audit logs for critical operations
- Email notification system
- User search and filtering

### **Organization Structure**
- **7 Sectors**: Education, Health, Environment, etc.
- **7 Departments**: Administration, HR, Database, etc.
- **3 Clubs**: Various activity-based clubs
- **Services**: Institutional and location-based services
- **Committees**: Central and regional committees

### **Public Website**
- Homepage with organization introduction
- Event galleries and highlights
- About Us (history, vision, mission)
- Volunteer directory (searchable by name/ID)
- Project Alokdhara information and donation
- Contact form

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Custom components with Framer Motion
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

### **Backend**
- **API**: Next.js API Routes (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v4
- **Email**: Nodemailer with SMTP
- **File Storage**: Local storage (configurable)
- **Real-time**: Ably for chat and notifications

### **External Services**
- **Google APIs**: OAuth 2.0 and Calendar API
- **Cloudflare**: Turnstile bot protection
- **Analytics**: Vercel Analytics
- **Deployment**: Vercel (recommended)

### **Development Tools**
- **Linting**: ESLint
- **Build**: Next.js Webpack/Turbopack
- **Database GUI**: Prisma Studio
- **Package Manager**: npm/yarn/pnpm

## 📦 Installation

### **Prerequisites**
- Node.js 18+ 
- PostgreSQL 14+
- npm/yarn/pnpm

### **Setup Steps**

1. **Clone the repository**
```bash
git clone <repository-url>
cd web
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Configuration**

Create a `.env.local` file in the root directory with the following variables:

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Base URL of your application
- `NEXTAUTH_SECRET` - Random secret for session encryption
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - Google OAuth credentials
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` & `TURNSTILE_SECRET_KEY` - Cloudflare Turnstile bot protection
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` - Email server configuration
- `ABLY_API_KEY` & `NEXT_PUBLIC_ABLY_CLIENT_ID` - Real-time messaging (Ably)

**Optional:**
- `GOOGLE_CALENDAR_REFRESH_TOKEN` - Google Calendar integration for HR


4. **Database Setup**
```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Or run migrations (production)
npx prisma migrate deploy

# (Optional) Seed initial data
npm run seed
```

5. **Run Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
web/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── api/                  # API routes
│   │   │   ├── auth/            # Authentication endpoints
│   │   │   │   ├── signup/      # User registration
│   │   │   │   ├── verify-email/ # Email verification
│   │   │   │   ├── resend-verification/ # Resend verification email
│   │   │   │   └── [...nextauth]/ # NextAuth handlers
│   │   │   ├── payments/        # Payment processing
│   │   │   ├── tasks/           # Task management
│   │   │   ├── donations/       # Donation handling
│   │   │   ├── hr/              # HR operations
│   │   │   └── user/            # User profile APIs
│   │   ├── dashboard/           # User dashboards
│   │   ├── auth/                # Auth pages
│   │   ├── verify-email/        # Email verification page
│   │   └── payments/            # Payment pages
│   ├── components/              # React components
│   │   ├── auth/                # Authentication components
│   │   ├── dashboard/           # Dashboard components
│   │   ├── sections/            # Homepage sections
│   │   ├── layout/              # Layout components
│   │   └── ui/                  # Reusable UI components
│   ├── lib/                     # Utility libraries
│   │   ├── auth.ts              # Auth helpers
│   │   ├── prisma.ts            # Prisma client
│   │   ├── email.ts             # Email sending
│   │   ├── validations.ts       # Zod schemas
│   │   ├── googleCalendar.ts    # Calendar integration
│   │   └── turnstile.ts         # Bot protection
│   ├── types/                   # TypeScript type definitions
│   └── hooks/                   # Custom React hooks
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Database migrations
├── public/                      # Static assets
├── docs/                        # Documentation
│   ├── AUTH_DOCUMENTATION.md
│   ├── GOOGLE_OAUTH_SETUP.md
│   ├── TURNSTILE_SETUP.md
│   └── CA_REFERENCE_SYSTEM.md
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.ts
```

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start dev server (Webpack)
npm run dev:turbo        # Start dev server (Turbopack)

# Production
npm run build            # Build for production
npm run start            # Start production server

# Database
npx prisma generate      # Generate Prisma Client
npx prisma db push       # Push schema changes
npx prisma migrate dev   # Create migration
npx prisma studio        # Open Prisma Studio
npm run seed             # Seed database

# Code Quality
npm run lint             # Run ESLint
```


## 🔐 Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **Email Verification**: Token-based with 24-hour expiry
- **Rate Limiting**: Resend verification limited to 5 attempts with 2-minute cooldown
- **Bot Protection**: Cloudflare Turnstile integration
- **SQL Injection Prevention**: Prisma parameterized queries
- **XSS Protection**: Next.js built-in sanitization
- **CSRF Protection**: NextAuth.js CSRF tokens
- **Environment Variables**: Sensitive data in .env files

## 🌐 Deployment

### **Vercel (Recommended)**

1. Push code to GitHub/GitLab
2. Import project in Vercel
3. Add environment variables
4. Deploy

```bash
# Build command (set in Vercel)
npm run build:vercel

# Environment variables required in Vercel:
# - All variables from .env.local
# - Set DATABASE_URL to production database
```

### **Manual Deployment**

```bash
# Build
npm run build

# Start
npm run start
```

## 🧪 Testing

- Manual testing recommended for critical flows
- Use Prisma Studio for database verification
- Check `/api/debug` endpoints (development only)

## 📊 Database Schema Highlights

### **Key Models**
- **User**: Complete user profile and authentication
- **Application**: Initial and final payment tracking
- **Task**: Task definitions with points
- **TaskSubmission**: Volunteer task completions
- **Donation**: Donation records
- **Service**: Institutional and regional services
- **Committee**: Organizational committees
- **Post**: Social feed posts
- **Message**: Chat messages
- **Notification**: User notifications

### **Enums**
- **UserStatus**: APPLICANT, ACTIVE, INACTIVE, BANNED
- **UserRole**: DEVELOPER, ADMIN, HR, SECRETARY, VOLUNTEER
- **PaymentStatus**: PENDING, APPROVED, REJECTED

## 🤝 Contributing

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## 📝 License

Proprietary - All rights reserved by Amar Somoy, Amar Desh

## 🙋 Support

For issues or questions:
- Check documentation in `/docs`
- Review `QUICK_START.md` for common tasks
- Contact system administrators

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Event management module
- [ ] Certificate generation system
- [ ] Push notifications
- [ ] Multi-language support
- [ ] Advanced search filters
- [ ] Export/Import data features

---

**Built with ❤️ for Amar Somoy, Amar Desh volunteers**

*Last Updated: February 2026*
