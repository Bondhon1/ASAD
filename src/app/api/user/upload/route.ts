import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

// This endpoint expects a JSON body: { fileName, mimeType, data: base64 }
// Uploads to Vercel Blob and returns the public URL.
// IMPORTANT: Never fall back to base64 data URLs — storing them in the DB
// causes enormous NeonDB network transfer because every query that selects
// profilePicUrl would transfer the entire encoded image.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { fileName, mimeType, data } = body as { fileName?: string; mimeType?: string; data?: string };
    if (!fileName || !data) return NextResponse.json({ error: 'fileName and data required' }, { status: 400 });

    // Reject if data is already a URL (nothing to upload)
    if (data.startsWith('http://') || data.startsWith('https://')) {
      return NextResponse.json({ url: data });
    }

    // Resolve blob token from environment
    const blobToken =
      process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.VERCEL_BLOB_READ_WRITE_TOKEN ||
      process.env.VERCEL_BLOB_TOKEN ||
      process.env.BLOB_TOKEN;

    if (!blobToken) {
      return NextResponse.json({ error: 'Blob storage is not configured on this server' }, { status: 500 });
    }

    const buffer = Buffer.from(data, 'base64');

    // Enforce a 4 MB limit on profile pictures to prevent abuse
    if (buffer.length > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large. Maximum size is 4 MB.' }, { status: 413 });
    }

    const blob = await put(`avatars/${fileName}`, buffer, {
      access: 'public',
      token: blobToken,
      contentType: mimeType || 'image/jpeg',
      addRandomSuffix: true, // prevent "already exists" errors on re-upload
    });

    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    console.error('Blob upload error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to upload image. Please try again.' }, { status: 500 });
  }
}
