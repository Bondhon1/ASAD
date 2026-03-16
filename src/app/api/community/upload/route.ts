import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["HR", "MASTER", "ADMIN", "DIRECTOR", "DATABASE_DEPT", "SECRETARIES"];

// POST /api/community/upload
// Uploads a post image to Vercel Blob and returns the public URL.
// Body: { fileName: string, mimeType: string, data: base64 }
// Max 8 MB per image, max 10 images per request call (handled on client).
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessionUser = session.user as any;
    const isOfficialOrStaff =
      sessionUser?.status === "OFFICIAL" || STAFF_ROLES.includes(sessionUser?.role ?? "");
    if (!isOfficialOrStaff) {
      return NextResponse.json({ error: "Only official members can upload images" }, { status: 403 });
    }

    const body = await request.json();
    const { fileName, mimeType, data } = body as { fileName?: string; mimeType?: string; data?: string };

    if (!fileName || !data) return NextResponse.json({ error: "fileName and data required" }, { status: 400 });

    if (data.startsWith("http://") || data.startsWith("https://")) {
      return NextResponse.json({ url: data });
    }

    const blobToken =
      process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.VERCEL_BLOB_READ_WRITE_TOKEN ||
      process.env.VERCEL_BLOB_TOKEN ||
      process.env.BLOB_TOKEN;

    if (!blobToken) {
      return NextResponse.json({ error: "Blob storage is not configured on this server" }, { status: 500 });
    }

    const buffer = Buffer.from(data, "base64");
    if (buffer.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large. Maximum size is 8 MB." }, { status: 413 });
    }

    const blob = await put(`community/${fileName}`, buffer, {
      access: "public",
      token: blobToken,
      contentType: mimeType || "image/jpeg",
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    console.error("Community upload error:", error?.message || error);
    return NextResponse.json({ error: "Failed to upload image. Please try again." }, { status: 500 });
  }
}
