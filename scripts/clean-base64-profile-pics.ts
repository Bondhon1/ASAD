/**
 * Migration: Upload base64-encoded profile pictures to Vercel Blob and update DB URLs
 *
 * For every User whose profilePicUrl is a raw base64 data: string, this script:
 *   1. Decodes the base64 payload
 *   2. Uploads it to Vercel Blob (under avatars/migrate-<userId>.<ext>)
 *   3. Updates the DB row with the returned public blob URL
 *
 * Run with:  npx tsx scripts/clean-base64-profile-pics.ts
 */

import { PrismaClient } from "@prisma/client";
import { put, list, del } from "@vercel/blob";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

// Parse a data: URL into { mimeType, ext, buffer }
function parseDataUrl(dataUrl: string): { mimeType: string; ext: string; buffer: Buffer } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = extMap[mimeType] ?? "jpg";
  return { mimeType, ext, buffer };
}

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("❌ BLOB_READ_WRITE_TOKEN is not set in .env");
    process.exit(1);
  }

  console.log("�️  Deleting previously migrated blobs (avatars/migrate-*) from Vercel Blob...");
  let deletedCount = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "avatars/migrate-", token, cursor });
    if (page.blobs.length > 0) {
      await del(page.blobs.map((b) => b.url), { token });
      deletedCount += page.blobs.length;
    }
    cursor = page.cursor;
  } while (cursor);
  console.log(`   Deleted ${deletedCount} existing blob(s).\n`);

  console.log("�🔍 Scanning for base64-encoded profilePicUrl entries...");

  const users = await prisma.user.findMany({
    where: { profilePicUrl: { startsWith: "data:" } },
    select: { id: true, email: true, profilePicUrl: true },
  });

  console.log(`   Found ${users.length} user(s) with base64 profile pictures.\n`);

  if (users.length === 0) {
    console.log("✅ Nothing to migrate.");
    return;
  }

  let success = 0;
  let failed = 0;

  for (const user of users) {
    const parsed = parseDataUrl(user.profilePicUrl!);
    if (!parsed) {
      console.warn(`  ⚠️  [${user.email}] Could not parse data URL — skipping.`);
      failed++;
      continue;
    }

    try {
      const blob = await put(
        `avatars/migrate-${user.id}.${parsed.ext}`,
        parsed.buffer,
        {
          access: "public",
          token,
          contentType: parsed.mimeType,
          allowOverwrite: true, // safe to overwrite if script is re-run
        }
      );

      await prisma.user.update({
        where: { id: user.id },
        data: { profilePicUrl: blob.url },
      });

      console.log(`  ✅ [${user.email}] → ${blob.url}`);
      success++;
    } catch (err: any) {
      console.error(`  ❌ [${user.email}] Upload failed: ${err?.message ?? err}`);
      failed++;
    }
  }

  console.log(`\nDone. Migrated: ${success}, Failed: ${failed}`);
}

main()
  .catch((e) => {
    console.error("❌ Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
