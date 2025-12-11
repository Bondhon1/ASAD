import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth";

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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
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
            // Existing user - just allow sign in
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
        
        // Check if new Google user needs payment
        if ((user as any).isNewGoogleUser) {
          token.needsPayment = true;
        } else if (account?.provider === "credentials") {
          // For credentials login, check payment status
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            include: { initialPayment: true },
          });
          token.needsPayment = !dbUser?.initialPayment;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).needsPayment = token.needsPayment;
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
  events: {
    async signIn({ user, isNewUser }) {
      if (isNewUser) {
        console.log("New user signed up:", user.email);
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
