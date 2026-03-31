"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { getSession } from "next-auth/react";

const APP_SCHEME = process.env.NEXT_PUBLIC_CAPACITOR_APP_SCHEME || "org.amarsomoyamardesh.app";

export default function CapacitorOAuthHandler() {
  const router = useRouter();

  // Initialize StatusBar for Android
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const initStatusBar = async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        // Set status bar to light style with white background, NOT overlaying
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: "#ffffff" });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch (error) {
        console.log("StatusBar not available:", error);
      }
    };

    initStatusBar();
  }, []);

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
