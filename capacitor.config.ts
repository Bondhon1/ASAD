import type { CapacitorConfig } from "@capacitor/cli";
import "dotenv/config";

const baseAppUrl =
  process.env.CAPACITOR_APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.amarsomoyamardesh.org";

const normalizedBaseAppUrl = baseAppUrl.endsWith("/")
  ? baseAppUrl.slice(0, -1)
  : baseAppUrl;

const appUrl = `${normalizedBaseAppUrl}/auth`;

const allowNavigation = Array.from(
  new Set([
    "amarsomoyamardesh.org",
    "www.amarsomoyamardesh.org",
    "app.amarsomoyamardesh.org",
    new URL(normalizedBaseAppUrl).hostname,
  ])
);

const config: CapacitorConfig = {
  appId: "org.amarsomoyamardesh.app",
  appName: "ASAD",
  webDir: "www",
  server: {
    url: appUrl,
    cleartext: normalizedBaseAppUrl.startsWith("http://"),
    androidScheme: "https",
    allowNavigation,
  },
  android: {
    // Middleware can detect this marker to force app-mode behavior.
    appendUserAgent: "ASAD-Android-App",
  },
  plugins: {
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: "#1E3A5F",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
