import type { CapacitorConfig } from "@capacitor/cli";

const appUrl =
  process.env.CAPACITOR_APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://app.amarsomoyamardesh.org";

const config: CapacitorConfig = {
  appId: "org.amarsomoyamardesh.app",
  appName: "ASAD",
  webDir: "www",
  server: {
    url: appUrl,
    cleartext: appUrl.startsWith("http://"),
    androidScheme: "https",
  },
  android: {
    // Middleware can detect this marker to force app-mode behavior.
    appendUserAgent: "ASAD-Android-App",
  },
};

export default config;
