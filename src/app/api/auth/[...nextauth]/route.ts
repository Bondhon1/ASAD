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
        
        // Fetch user role and status from database
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: { role: true, status: true, initialPayment: true },
        });
        
        if (dbUser) {
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.needsPayment = !dbUser.initialPayment;
        }
        
        // Check if new Google user needs payment
        if ((user as any).isNewGoogleUser) {
          token.needsPayment = true;
          token.role = "VOLUNTEER";
          token.status = "APPLICANT";
        }
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
