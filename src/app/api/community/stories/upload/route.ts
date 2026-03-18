import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { put } from "@vercel/blob";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 75;
const WEBP_QUALITY = 72;

async function compressImageBuffer(input: Buffer, mimeType?: string) {
  const sharp = (await import("sharp")).default;

  const image = sharp(input, { failOn: "none" });
  const metadata = await image.metadata();

  const basePipeline = image
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    });

  const hasAlpha = metadata.hasAlpha === true;

  if (hasAlpha || mimeType === "image/png" || mimeType === "image/webp") {
    const buffer = await basePipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
    return { buffer, contentType: "image/webp", extension: "webp" };
  }

  const buffer = await basePipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
  return { buffer, contentType: "image/jpeg", extension: "jpg" };
}

// POST /api/community/stories/upload
// Body: { fileName: string, mimeType: string, data: base64 }
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessionUser = session.user as { role?: string };
    if (sessionUser?.role !== "MASTER") {
      return NextResponse.json({ error: "Only MASTER can upload stories" }, { status: 403 });
    }

    const body = await request.json();
    const { fileName, mimeType, data } = body as {
      fileName?: string;
      mimeType?: string;
      data?: string;
    };

    if (!fileName || !data) {
      return NextResponse.json({ error: "fileName and data required" }, { status: 400 });
    }

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
    if (buffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image too large. Maximum size is 8 MB." }, { status: 413 });
    }

    const safeMimeType = mimeType || "image/jpeg";
    if (!safeMimeType.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
    }

    let compressed;
    try {
      compressed = await compressImageBuffer(buffer, safeMimeType);
    } catch (error) {
      console.error("Story image compression failed:", error);
      return NextResponse.json({ error: "Failed to compress image" }, { status: 400 });
    }

    const normalizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const baseName = normalizedFileName.replace(/\.[^.]+$/, "") || "story";
    const uploadFileName = `${baseName}.${compressed.extension}`;

    const blob = await put(`community/stories/${uploadFileName}`, compressed.buffer, {
      access: "public",
      token: blobToken,
      contentType: compressed.contentType,
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Story upload error:", message);
    return NextResponse.json({ error: "Failed to upload image. Please try again." }, { status: 500 });
  }
}
