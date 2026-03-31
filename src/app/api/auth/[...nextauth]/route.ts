import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      id: "google-native",
      name: "Google Native",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) {
          throw new Error("ID token required");
        }

        // Import OAuth2Client
        const { OAuth2Client } = require("google-auth-library");
        const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

        try {
          // Verify the Google ID token
          const ticket = await googleClient.verifyIdToken({
            idToken: credentials.idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
          });

          const payload = ticket.getPayload();
          if (!payload || !payload.email || !payload.email_verified) {
            throw new Error("Invalid or unverified Google token");
          }

          // Check if user exists in our database
          const user = await prisma.user.findUnique({
            where: { email: payload.email },
            include: { initialPayment: true },
          });

          if (!user) {
            throw new Error("User not found. Please complete registration.");
          }

          if (user.status === "BANNED") {
            throw new Error("Your account has been suspended");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.fullName || user.username,
          };
        } catch (error) {
          console.error("Google native auth error:", error);
          throw new Error(error instanceof Error ? error.message : "Authentication failed");
        }
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        turnstileToken: { label: "Turnstile Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // Verify Turnstile token
        if (!credentials.turnstileToken) {
          throw new Error("Security verification required");
        }

        const isValidToken = await verifyTurnstileToken(credentials.turnstileToken);
        if (!isValidToken) {
          throw new Error("Security verification failed");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            initialPayment: true,
          },
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        // Check email verification
        if (!user.emailVerified) {
          throw new Error("Please verify your email before logging in");
        }

        // Check if banned
        if (user.status === "BANNED") {
          throw new Error("Your account has been suspended");
        }

        const isPasswordValid = await comparePassword(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName || user.username,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Check if user exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
            include: {
              initialPayment: true,
              volunteerProfile: true,
            },
          });

          if (existingUser) {
            // Existing user - disallow sign-in if banned
            if (existingUser.status === 'BANNED') {
              console.warn('Banned user attempted Google sign-in:', user.email);
              return false;
            }
            return true;
          } else {
            // New Google user - create account
            const newUser = await prisma.user.create({
              data: {
                email: user.email!,
                fullName: user.name || user.email!.split("@")[0],
                username: user.email!.split("@")[0],
                emailVerified: true,
                status: "APPLICANT",
                role: "VOLUNTEER",
              },
            });

            // Create volunteer profile
            await prisma.volunteerProfile.create({
              data: {
                userId: newUser.id,
                points: 0,
              },
            });

            // Store flag that this is a new Google user needing payment
            (user as any).isNewGoogleUser = true;
            return true;
          }
        } catch (error) {
          console.error("Error in Google sign-in:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }

      // Always fetch the latest role/status from DB so changes (e.g. approval
      // to OFFICIAL) are reflected without requiring a re-login.
      const lookupEmail = (token.email as string | undefined) ?? (user?.email ?? undefined);
      if (lookupEmail) {
        const dbUser = await prisma.user.findUnique({
          where: { email: lookupEmail },
          select: { id: true, role: true, status: true, initialPayment: true },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.needsPayment = !dbUser.initialPayment;
        }
      }

      // For brand-new Google users the DB record is just created; override
      // only if the flag is explicitly set (safety net).
      if ((user as any)?.isNewGoogleUser) {
        token.needsPayment = true;
        token.role = "VOLUNTEER";
        token.status = "APPLICANT";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).needsPayment = token.needsPayment;
        (session.user as any).role = token.role;
        (session.user as any).status = token.status;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      const appScheme = process.env.CAPACITOR_APP_SCHEME || "org.amarsomoyamardesh.app";
      const schemePrefix = `${appScheme}://`;

      if (url.startsWith(schemePrefix)) {
        return url;
      }

      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const nextUrl = new URL(url);
        if (nextUrl.origin === baseUrl) {
          return url;
        }
      } catch {
        return baseUrl;
      }

      return baseUrl;
    },
  },
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  session: {
    strategy: "jwt",
  },
  events: {},
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
