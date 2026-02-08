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
│   ├── app/                              # Next.js App Router pages
│   │   ├── page.tsx                      # Homepage
│   │   ├── layout.tsx                    # Root layout
│   │   ├── globals.css                   # Global styles
│   │   ├── robots.ts                     # Robots.txt generation
│   │   ├── sitemap.ts                    # Sitemap generation
│   │   ├── api/                          # API routes
│   │   │   ├── ably/                     # Ably real-time messaging
│   │   │   │   └── token/                # Ably token generation
│   │   │   ├── admin/                    # Admin endpoints
│   │   │   │   └── audit-logs/           # Admin audit logs
│   │   │   ├── auth/                     # Authentication endpoints
│   │   │   │   ├── signup/               # User registration
│   │   │   │   ├── verify-email/         # Email verification
│   │   │   │   ├── resend-verification/  # Resend verification email
│   │   │   │   ├── forgot-password/      # Password reset request
│   │   │   │   ├── reset-password/       # Password reset handler
│   │   │   │   ├── google-precreate/     # Google OAuth pre-creation
│   │   │   │   ├── google-calendar-setup/ # Google Calendar setup
│   │   │   │   └── [...nextauth]/        # NextAuth handlers
│   │   │   ├── ca-references/            # CA reference system
│   │   │   │   ├── search/               # Reference search
│   │   │   │   └── stats/                # Reference statistics
│   │   │   ├── database/                 # Database management
│   │   │   │   └── manual-points/        # Manual points adjustment
│   │   │   ├── debug/                    # Debug endpoints
│   │   │   │   └── payment-stats/        # Payment statistics
│   │   │   ├── donations/                # Donation handling
│   │   │   │   ├── create/               # Create donation
│   │   │   │   ├── submit/               # Submit donation
│   │   │   │   └── approve-submission/   # Approve donation
│   │   │   ├── hr/                       # HR operations
│   │   │   │   ├── applications/         # Application management
│   │   │   │   ├── calendar-status/      # Calendar connection status
│   │   │   │   ├── clubs/                # Club management
│   │   │   │   ├── connect-calendar/     # Google Calendar connection
│   │   │   │   ├── institutes/           # Institute management
│   │   │   │   ├── interview-slots/      # Interview scheduling
│   │   │   │   ├── payments/             # Payment approvals
│   │   │   │   ├── ranks/                # Rank management
│   │   │   │   ├── sectors/              # Sector management
│   │   │   │   ├── services/             # Service assignments
│   │   │   │   └── users/                # User management
│   │   │   ├── institutes/               # Institute data
│   │   │   │   └── suggestions/          # Institute suggestions
│   │   │   ├── notifications/            # Notification system
│   │   │   ├── orgs/                     # Organization data
│   │   │   ├── payments/                 # Payment processing
│   │   │   │   ├── initial/              # Initial payment (30 BDT)
│   │   │   │   └── final/                # Final payment (170 BDT)
│   │   │   ├── secretaries/              # Secretary operations
│   │   │   │   ├── donationCampaigns/    # Donation campaigns
│   │   │   │   └── tasks/                # Secretary task management
│   │   │   ├── tasks/                    # Task management
│   │   │   │   ├── submit/               # Task submission
│   │   │   │   ├── process-expired/      # Process expired tasks
│   │   │   │   └── [id]/                 # Task details
│   │   │   └── user/                     # User profile APIs
│   │   │       ├── profile/              # Profile management
│   │   │       ├── update/               # Profile updates
│   │   │       ├── upload/               # File uploads
│   │   │       ├── interview/            # Interview information
│   │   │       └── change-password/      # Password change
│   │   ├── about/                        # About Us page
│   │   ├── auth/                         # Auth pages
│   │   ├── dashboard/                    # User dashboards
│   │   │   ├── page.tsx                  # Main dashboard
│   │   │   ├── admin/                    # Admin dashboard
│   │   │   │   ├── audit-logs/           # Audit logs viewer
│   │   │   │   └── clone-db/             # Database cloning
│   │   │   ├── database/                 # Database dashboard
│   │   │   │   ├── page.tsx              # Database overview
│   │   │   │   └── manual-points/        # Manual points adjustment
│   │   │   ├── donations/                # Donations dashboard
│   │   │   │   ├── page.tsx              # Donations overview
│   │   │   │   └── create/               # Create donation campaign
│   │   │   ├── hr/                       # HR dashboard
│   │   │   │   ├── approvals/            # Application approvals
│   │   │   │   ├── interviews/           # Interview management
│   │   │   │   ├── requests/             # HR requests
│   │   │   │   ├── services/             # Service management
│   │   │   │   └── users/                # User management
│   │   │   ├── secretaries/              # Secretaries dashboard
│   │   │   ├── settings/                 # Settings page
│   │   │   └── tasks/                    # Tasks dashboard
│   │   │       ├── page.tsx              # Tasks overview
│   │   │       └── manage/               # Task management
│   │   ├── payments/                     # Payment pages
│   │   │   ├── initial/                  # Initial payment page
│   │   │   └── final/                    # Final payment page
│   │   ├── privacy/                      # Privacy policy
│   │   ├── reset-password/               # Password reset page
│   │   │   └── ResetPasswordClient.tsx   # Reset password client component
│   │   ├── sectors/                      # Sectors page
│   │   │   └── sectors.css               # Sector styles
│   │   ├── settings/                     # User settings
│   │   ├── tasks/                        # Task pages
│   │   │   └── [id]/                     # Task details
│   │   ├── terms/                        # Terms of service
│   │   └── verify-email/                 # Email verification page
│   ├── components/                       # React components
│   │   ├── auth/                         # Authentication components
│   │   │   ├── AuthPage.tsx              # Main auth page
│   │   │   ├── EmailVerificationPage.tsx # Email verification
│   │   │   ├── FinalPaymentPage.tsx      # Final payment component
│   │   │   └── InitialPaymentPage.tsx    # Initial payment component
│   │   ├── dashboard/                    # Dashboard components
│   │   │   ├── DashboardLayout.tsx       # Dashboard layout
│   │   │   └── NotificationDropdown.tsx  # Notification dropdown
│   │   ├── layout/                       # Layout components
│   │   │   ├── Header.tsx                # Site header
│   │   │   └── Footer.tsx                # Site footer
│   │   ├── providers/                    # Context providers
│   │   │   ├── SessionProvider.tsx       # NextAuth session provider
│   │   │   └── NotificationProvider.tsx  # Notification provider
│   │   ├── sections/                     # Homepage sections
│   │   │   ├── Hero.tsx                  # Hero section
│   │   │   ├── AboutSection.tsx          # About section
│   │   │   ├── ActivitiesShowcase.tsx    # Activities showcase
│   │   │   ├── JoinUs.tsx                # Join us section
│   │   │   ├── NoticeBoard.tsx           # Notice board
│   │   │   ├── Partners.tsx              # Partners section
│   │   │   ├── ProjectHighlight.tsx      # Project highlights
│   │   │   ├── SectorGrid.tsx            # Sector grid
│   │   │   ├── StatsStrip.tsx            # Statistics strip
│   │   │   ├── VolunteerDirectory.tsx    # Volunteer directory
│   │   │   └── VolunteerJourney.tsx      # Volunteer journey
│   │   └── ui/                           # Reusable UI components
│   │       ├── AppDashboardLoading.tsx   # Dashboard loading state
│   │       ├── AppLoading.tsx            # App loading state
│   │       ├── ConfirmDialog.tsx         # Confirmation dialog
│   │       ├── ConfirmModal.tsx          # Confirmation modal
│   │       ├── FlashModal.tsx            # Flash modal
│   │       ├── InputModal.tsx            # Input modal
│   │       ├── ModalProvider.tsx         # Modal provider
│   │       └── SectionHeading.tsx        # Section heading
│   ├── content/                          # Content data
│   │   └── homepage.ts                   # Homepage content
│   ├── hooks/                            # Custom React hooks
│   │   ├── useCachedUserProfile.ts       # Cached user profile hook
│   │   └── useInView.ts                  # Intersection observer hook
│   ├── lib/                              # Utility libraries
│   │   ├── ably.ts                       # Ably configuration
│   │   ├── auth.ts                       # Auth helpers
│   │   ├── bdGeo.ts                      # Bangladesh geography data
│   │   ├── cn.ts                         # Class name utility
│   │   ├── dateUtils.ts                  # Date utilities
│   │   ├── email.ts                      # Email sending
│   │   ├── encryption.ts                 # Encryption utilities
│   │   ├── googleCalendar.ts             # Calendar integration
│   │   ├── hrUsersCache.ts               # HR users cache
│   │   ├── organizations.ts              # Organization utilities
│   │   ├── prisma.ts                     # Prisma client
│   │   ├── rankUtils.ts                  # Rank calculation utilities
│   │   ├── serviceAssignment.ts          # Service assignment logic
│   │   ├── turnstile.ts                  # Bot protection
│   │   ├── useDelayedLoader.ts           # Delayed loader hook
│   │   ├── validations.ts                # Zod schemas
│   │   └── institutes-data/              # Institute data
│   │       ├── index.ts                  # Institute data exports
│   │       ├── bd_collegeName_data.json  # College names
│   │       ├── bd_madrashaName_data.json # Madrasha names
│   │       ├── bd_schoolName_data.json   # School names
│   │       ├── english_medium_data.json  # English medium schools
│   │       ├── nu_Uni_data.json          # National University data
│   │       ├── private_Uni_data.json     # Private universities
│   │       └── public_Uni_data.json      # Public universities
│   └── types/                            # TypeScript type definitions
├── prisma/
│   ├── schema.prisma                     # Database schema
│   └── migrations/                       # Database migrations
├── public/                               # Static assets
│   ├── alokdhara.jpg                     # Project Alokdhara image
│   ├── banner.jpg                        # Banner image
│   ├── logo.jpg                          # Organization logo
│   ├── three-people.svg                  # Illustrations
│   ├── file.svg, globe.svg, etc.         # UI icons
│   ├── site.webmanifest                  # PWA manifest
│   ├── google3910f7d6f9032e3a.html       # Google verification
│   ├── icons/                            # App icons
│   │   ├── logo-192.svg                  # 192x192 logo
│   │   └── logo-512.svg                  # 512x512 logo
│   └── sectors/                          # Sector images
│       ├── education.png                 # Education sector
│       ├── medical.png                   # Medical sector
│       ├── nature.png                    # Environment sector
│       ├── blood.png                     # Blood donation
│       ├── charity.png                   # Charity work
│       ├── cultural.png                  # Cultural activities
│       ├── photography.png               # Photography
│       ├── sports1-5.png                 # Sports activities
│       ├── english1-5.png                # English club
│       └── memers1-5.png                 # Meme club
├── bd-all-institutes/                    # Bangladesh institutes package
│   ├── index.js                          # Package entry point
│   ├── package.json                      # Package manifest
│   ├── README.md                         # Package documentation
│   ├── LICENSE                           # Package license
│   └── data/                             # Institute data files
│       ├── bd_collegeName_data.json      # College names
│       ├── bd_madrashaName_data.json     # Madrasha names
│       ├── bd_schoolName_data.json       # School names
│       ├── english_medium_data.json      # English medium schools
│       ├── nu_Uni_data.json              # National University data
│       ├── private_Uni_data.json         # Private universities
│       └── public_Uni_data.json          # Public universities
├── scripts/                              # Build and utility scripts
├── package.json                          # Project dependencies
├── tsconfig.json                         # TypeScript configuration
├── next.config.ts                        # Next.js configuration
├── next-env.d.ts                         # Next.js TypeScript definitions
├── eslint.config.mjs                     # ESLint configuration
├── postcss.config.mjs                    # PostCSS configuration
├── prisma.config.ts                      # Prisma configuration
├── vercel.json                           # Vercel deployment config
├── README.md                             # This file

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
