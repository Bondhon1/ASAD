import { NextRequest, NextResponse } from "next/server";

const sanitizeEnv = (value?: string) => (value || "").trim().replace(/^['\"]|['\"]$/g, "");

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const requestedTarget = url.searchParams.get("target") || "/dashboard";
  const safeTarget = requestedTarget.startsWith("/") ? requestedTarget : "/dashboard";

  const appScheme =
    sanitizeEnv(process.env.CAPACITOR_APP_SCHEME) ||
    sanitizeEnv(process.env.NEXT_PUBLIC_CAPACITOR_APP_SCHEME) ||
    "org.amarsomoyamardesh.app";

  const deepLinkUrl = `${appScheme}://auth-callback?target=${encodeURIComponent(safeTarget)}`;

  return NextResponse.redirect(deepLinkUrl, { status: 302 });
}
