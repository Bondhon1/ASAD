import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const APP_BLOCKED_PUBLIC_PATHS = [
  "/",
  "/about",
  "/sectors",
];

function isAndroidAppRequest(request: NextRequest): boolean {
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  const appClient = request.headers.get("x-apc-client")?.toLowerCase() ?? "";
  const appMode = request.headers.get("x-app-mode")?.toLowerCase() ?? "";
  const userAgent = request.headers.get("user-agent")?.toLowerCase() ?? "";

  return (
    process.env.APP_MODE_FORCE_ANDROID === "true" ||
    host.startsWith("app.") ||
    appClient === "android" ||
    appMode === "android" ||
    appMode === "1" ||
    appMode === "true" ||
    userAgent.includes("asad-android-app")
  );
}

function isBlockedPublicPath(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }

  return APP_BLOCKED_PUBLIC_PATHS.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function middleware(request: NextRequest) {
  if (!isAndroidAppRequest(request)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (isBlockedPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|site.webmanifest|icons|google3910f7d6f9032e3a.html).*)",
  ],
};
