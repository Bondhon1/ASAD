"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { getSession } from "next-auth/react";

const APP_SCHEME = process.env.NEXT_PUBLIC_CAPACITOR_APP_SCHEME || "org.amarsomoyamardesh.app";

export default function CapacitorOAuthHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let cleanup: (() => void) | undefined;

    const setup = async () => {
      const { App } = await import("@capacitor/app");
      const { Browser } = await import("@capacitor/browser");

      const listener = await App.addListener("appUrlOpen", async ({ url }) => {
        if (!url || !url.toLowerCase().startsWith(`${APP_SCHEME.toLowerCase()}://`)) {
          return;
        }

        try {
          await Browser.close();
        } catch {
          // No-op if browser is already closed.
        }

        let target = "/dashboard";

        try {
          const parsed = new URL(url);
          const requestedTarget = parsed.searchParams.get("target");
          if (requestedTarget && requestedTarget.startsWith("/")) {
            target = requestedTarget;
          }
        } catch {
          // Keep default dashboard target.
        }

        try {
          await getSession();
        } catch {
          // Session refresh best effort.
        }

        router.replace(target);
        router.refresh();
      });

      cleanup = () => {
        listener.remove();
      };
    };

    setup();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [router]);

  return null;
}
