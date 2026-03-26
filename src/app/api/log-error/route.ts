import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logError, getRequestMetadata } from "@/lib/errorLogger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const requestMetadata = getRequestMetadata(req);

    const body = await req.json();
    const {
      endpoint,
      method = "UNKNOWN",
      errorType = "ClientError",
      errorMessage = "Unknown error",
      stackTrace,
      metadata,
    } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Missing endpoint parameter" },
        { status: 400 }
      );
    }

    // Create error object for logging
    const error = new Error(errorMessage);
    (error as any).name = errorType;
    if (stackTrace) {
      error.stack = stackTrace;
    }

    // Log to audit database
    await logError({
      endpoint,
      method,
      error,
      userId: undefined,
      userEmail: session?.user?.email || undefined,
      userAgent: requestMetadata.userAgent,
      ipAddress: requestMetadata.ipAddress,
      metadata: {
        ...metadata,
        clientTimestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    // Don't expose error details to client
    console.error("[POST /api/log-error] Error:", err);
    return NextResponse.json(
      { error: "Failed to log error" },
      { status: 500 }
    );
  }
}
