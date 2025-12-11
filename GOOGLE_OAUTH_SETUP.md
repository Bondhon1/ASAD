# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth authentication for the ASAD platform.

## Prerequisites
- A Google account
- Access to Google Cloud Console

## Step-by-Step Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `ASAD Volunteer Platform`
4. Click "Create"

### 2. Enable Google+ API

1. In the left sidebar, navigate to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on it and press "Enable"

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Click "Create"
4. Fill in the required information:
   - **App name**: ASAD Volunteer Platform
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. On "Scopes" page, click "Save and Continue" (no additional scopes needed)
7. On "Test users" page, add your email for testing
8. Click "Save and Continue"

### 4. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click "Create Credentials" → "OAuth client ID"
3. Select application type: **Web application**
4. Configure:
   - **Name**: ASAD Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://yourdomain.com/api/auth/callback/google` (for production)
5. Click "Create"
6. Copy the **Client ID** and **Client Secret**

### 5. Update Environment Variables

1. Open your `.env` file (create from `.env.example` if needed)
2. Add the credentials:

```env
# Google OAuth
GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret-here"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"  # Update for production
NEXTAUTH_SECRET="generate-with-openssl-rand-hex-32"
```

3. Generate NEXTAUTH_SECRET:
```bash
openssl rand -hex 32
```

### 6. Test the Integration

1. Restart your development server:
```bash
npm run dev
```

2. Navigate to: `http://localhost:3000/auth`
3. Click "Continue with Google"
4. Sign in with your Google account
5. Verify you're redirected to the dashboard

## How It Works

### User Flow
1. User clicks "Continue with Google"
2. Redirected to Google's consent screen
3. User approves access
4. Google redirects back to `/api/auth/callback/google`
5. NextAuth creates/finds user in database
6. User is redirected to dashboard

### Auto-User Creation
When a user signs in with Google for the first time:
- A new user record is created in the database
- Email, name extracted from Google profile
- Status set to `APPLICANT`
- VolunteerProfile created with 0 points
- User needs to complete payment to continue

### Database Integration
The authentication integrates with Prisma:
```typescript
callbacks: {
  async signIn({ user, account, profile }) {
    if (account?.provider === "google") {
      // Check if user exists
      // Create new user if doesn't exist
      // Set status to APPLICANT
    }
    return true;
  }
}
```

## Troubleshooting

### Error: redirect_uri_mismatch
- Verify redirect URI in Google Console matches exactly: `http://localhost:3000/api/auth/callback/google`
- Check for trailing slashes or typos

### Error: Access blocked: This app's request is invalid
- OAuth consent screen not properly configured
- Add your email to test users in consent screen settings

### Error: NEXTAUTH_URL missing
- Ensure `.env` file has `NEXTAUTH_URL` set
- Restart development server after updating .env

### Google button not working
- Check browser console for errors
- Verify `next-auth` is installed: `npm list next-auth`
- Check SessionProvider wraps application in layout.tsx

## Production Deployment

For production deployment:

1. Update authorized origins and redirect URIs in Google Console
2. Update environment variables:
```env
NEXTAUTH_URL="https://yourdomain.com"
GOOGLE_CLIENT_ID="production-client-id"
GOOGLE_CLIENT_SECRET="production-client-secret"
```

3. Verify OAuth consent screen is published (not in testing mode)

## Security Best Practices

- ✅ Never commit `.env` file to git
- ✅ Use different credentials for development/production
- ✅ Regularly rotate NEXTAUTH_SECRET
- ✅ Keep OAuth consent screen information up-to-date
- ✅ Monitor OAuth usage in Google Console

## Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
