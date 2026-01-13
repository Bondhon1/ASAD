"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export default function SessionProvider({ children }: { children: ReactNode }) {
  // Disable automatic refetching to reduce repeated /api/auth/session calls
  return (
    <NextAuthSessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      {children}
    </NextAuthSessionProvider>
  );
}
