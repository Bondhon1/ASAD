import type { CapacitorConfig } from "@capacitor/cli";
import "dotenv/config";

const useRemoteServer = process.env.CAPACITOR_USE_REMOTE_URL === "true";
const baseAppUrl =
  process.env.CAPACITOR_APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://amarsomoyamardesh.org";

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
  android: {
    // Middleware can detect this marker to force app-mode behavior.
    appendUserAgent: "ASAD-Android-App",
  },
  plugins: {
    Keyboard: {
      resize: "native",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#ffffff",
      overlaysWebView: false,
    },
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      launchFadeOutDuration: 800,
      backgroundColor: "#1E3A5F",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

if (useRemoteServer) {
  config.server = {
    url: appUrl,
    cleartext: normalizedBaseAppUrl.startsWith("http://"),
    androidScheme: "https",
    allowNavigation,
  };
}

export default config;
