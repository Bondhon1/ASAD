import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

export const dynamic = "force-dynamic";

type StoryDelegate = {
  findUnique: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
};

const prismaStory = (prisma as unknown as { story: StoryDelegate }).story;

function getBlobToken() {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.VERCEL_BLOB_READ_WRITE_TOKEN ||
    process.env.VERCEL_BLOB_TOKEN ||
    process.env.BLOB_TOKEN ||
    null
  );
}

function isLikelyStoryBlobUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes("/community/stories/");
  } catch {
    return false;
  }
}

async function deleteStoryBlobUrl(imageUrl: string | null | undefined) {
  if (!imageUrl || !isLikelyStoryBlobUrl(imageUrl)) {
    return;
  }

  const blobToken = getBlobToken();
  if (!blobToken) {
    console.warn("Story blob cleanup skipped: blob token is not configured");
    return;
  }

  try {
    await del(imageUrl, { token: blobToken });
  } catch (error) {
    console.error("Story blob cleanup failed", error);
  }
}

const STORY_INCLUDE = {
  createdBy: {
    select: {
      id: true,
      fullName: true,
      volunteerId: true,
      profilePicUrl: true,
    },
  },
};

// PATCH /api/community/stories/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user || user.role !== "MASTER") {
      return NextResponse.json({ error: "Only MASTER can edit stories" }, { status: 403 });
    }

    const story = await prismaStory.findUnique({
      where: { id },
      include: STORY_INCLUDE,
    }) as {
      id: string;
      imageUrl: string;
      createdById: string;
      displayName: string | null;
      info: string | null;
      externalLink: string | null;
      createdBy: {
        id: string;
        fullName: string | null;
        volunteerId: string | null;
        profilePicUrl: string | null;
      };
    } | null;

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const body = await request.json();
    const hasDisplayName = Object.prototype.hasOwnProperty.call(body, "displayName");
    const hasInfo = Object.prototype.hasOwnProperty.call(body, "info");
    const hasExternalLink = Object.prototype.hasOwnProperty.call(body, "externalLink");
    const hasImageUrl = Object.prototype.hasOwnProperty.call(body, "imageUrl");

    if (!hasDisplayName && !hasInfo && !hasExternalLink && !hasImageUrl) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const updateData: {
      displayName?: string | null;
      info?: string | null;
      externalLink?: string | null;
      imageUrl?: string;
    } = {};

    if (hasDisplayName) {
      const nextDisplayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
      updateData.displayName = nextDisplayName ? nextDisplayName.slice(0, 120) : null;
    }

    if (hasInfo) {
      const nextInfo = typeof body.info === "string" ? body.info.trim() : "";
      updateData.info = nextInfo ? nextInfo.slice(0, 220) : null;
    }

    if (hasExternalLink) {
      const nextExternalLink = typeof body.externalLink === "string" ? body.externalLink.trim() : "";
      if (nextExternalLink && !nextExternalLink.startsWith("http://") && !nextExternalLink.startsWith("https://")) {
        return NextResponse.json({ error: "externalLink must start with http:// or https://" }, { status: 400 });
      }
      updateData.externalLink = nextExternalLink ? nextExternalLink.slice(0, 500) : null;
    }

    let nextImageUrl = story.imageUrl;
    if (hasImageUrl) {
      const normalizedImageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
      if (!normalizedImageUrl || (!normalizedImageUrl.startsWith("http://") && !normalizedImageUrl.startsWith("https://"))) {
        return NextResponse.json({ error: "A valid imageUrl is required" }, { status: 400 });
      }
      updateData.imageUrl = normalizedImageUrl;
      nextImageUrl = normalizedImageUrl;
    }

    const updated = await prismaStory.update({
      where: { id },
      data: updateData,
      include: STORY_INCLUDE,
    }) as {
      id: string;
      imageUrl: string;
      displayName: string | null;
      info: string | null;
      externalLink: string | null;
      createdBy: {
        id: string;
        fullName: string | null;
        volunteerId: string | null;
        profilePicUrl: string | null;
      };
      createdAt: string;
    };

    if (story.imageUrl && story.imageUrl !== nextImageUrl) {
      await deleteStoryBlobUrl(story.imageUrl);
    }

    return NextResponse.json({ story: updated });
  } catch (error) {
    console.error("PATCH /api/community/stories/[id] error", error);
    return NextResponse.json({ error: "Failed to update story" }, { status: 500 });
  }
}

// DELETE /api/community/stories/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user || user.role !== "MASTER") {
      return NextResponse.json({ error: "Only MASTER can delete stories" }, { status: 403 });
    }

    const story = await prismaStory.findUnique({
      where: { id },
      select: { id: true, imageUrl: true },
    }) as { id: string; imageUrl: string } | null;

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    await prismaStory.delete({ where: { id } });
    await deleteStoryBlobUrl(story.imageUrl);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/community/stories/[id] error", error);
    return NextResponse.json({ error: "Failed to delete story" }, { status: 500 });
  }
}
