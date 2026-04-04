import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { put } from "@vercel/blob";
import { getOfficialPostImageToggle } from "@/lib/communityPostImageToggle";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["HR", "MASTER", "ADMIN", "DIRECTOR", "DATABASE_DEPT", "SECRETARIES"];

// Keep this under common serverless request limits so payloads are accepted reliably.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
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

// POST /api/community/upload
// Uploads a post image to Vercel Blob and returns the public URL.
// Preferred body: multipart/form-data with field "file"
// Legacy body: { fileName: string, mimeType: string, data: base64 }
// Max 4 MB per image, max 10 images per request call (handled on client).
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

    const contentType = request.headers.get("content-type") || "";

    let fileName: string | undefined;
    let mimeType: string | undefined;
    let context: string | undefined;
    let buffer: Buffer | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const uploaded = formData.get("file");
      context = String(formData.get("context") || "").trim() || undefined;

      if (!(uploaded instanceof File)) {
        return NextResponse.json({ error: "file is required" }, { status: 400 });
      }

      fileName = uploaded.name;
      mimeType = uploaded.type;
      buffer = Buffer.from(await uploaded.arrayBuffer());
    } else {
      const body = await request.json();
      const data = body?.data as string | undefined;
      fileName = body?.fileName;
      mimeType = body?.mimeType;
      context = body?.context;

      if (!fileName || !data) {
        return NextResponse.json({ error: "fileName and data required" }, { status: 400 });
      }

      if (data.startsWith("http://") || data.startsWith("https://")) {
        return NextResponse.json({ url: data });
      }

      buffer = Buffer.from(data, "base64");
    }

    if (context === "REGULAR_POST") {
      const enabled = await getOfficialPostImageToggle();
      if (!enabled || sessionUser?.status !== "OFFICIAL") {
        return NextResponse.json(
          { error: "Image upload for regular posts is currently disabled" },
          { status: 403 }
        );
      }
    }

    const blobToken =
      process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.VERCEL_BLOB_READ_WRITE_TOKEN ||
      process.env.VERCEL_BLOB_TOKEN ||
      process.env.BLOB_TOKEN;

    if (!blobToken) {
      return NextResponse.json({ error: "Blob storage is not configured on this server" }, { status: 500 });
    }

    if (!buffer || !fileName) {
      return NextResponse.json({ error: "Invalid upload payload" }, { status: 400 });
    }

    if (buffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image too large. Maximum size is 4 MB." }, { status: 413 });
    }

    const safeMimeType = mimeType || "image/jpeg";
    if (!safeMimeType.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
    }

    let compressed;
    try {
      compressed = await compressImageBuffer(buffer, safeMimeType);
    } catch (error) {
      console.error("Image compression failed:", error);
      return NextResponse.json({ error: "Failed to compress image" }, { status: 400 });
    }

    const normalizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const baseName = normalizedFileName.replace(/\.[^.]+$/, "") || "image";
    const uploadFileName = `${baseName}.${compressed.extension}`;

    const blob = await put(`community/${uploadFileName}`, compressed.buffer, {
      access: "public",
      token: blobToken,
      contentType: compressed.contentType,
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    console.error("Community upload error:", error?.message || error);
    return NextResponse.json({ error: "Failed to upload image. Please try again." }, { status: 500 });
  }
}
