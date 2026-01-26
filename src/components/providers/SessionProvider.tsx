"use client";

import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react";
import { ReactNode, useEffect } from "react";

function SessionSync() {
  const { data: session } = useSession();

  useEffect(() => {
    try {
      if (session && session.user) {
        const ttl = 7 * 24 * 60 * 60 * 1000; // 7 days
        const payload = {
          user: {
            name: session.user.name || null,
            email: session.user.email || null,
            image: session.user.image || null,
          },
          expiresAt: Date.now() + ttl,
          createdAt: Date.now(),
        };
        localStorage.setItem("asad_session", JSON.stringify(payload));
      } else {
        // remove any stale local session when signed out
        localStorage.removeItem("asad_session");
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [session]);

  return null;
}

export default function SessionProvider({ children }: { children: ReactNode }) {
  // Disable automatic refetching to reduce repeated /api/auth/session calls
  return (
    <NextAuthSessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <SessionSync />
      {children}
    </NextAuthSessionProvider>
  );
}
