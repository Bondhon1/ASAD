import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        institute: true,
        volunteerProfile: { include: { rank: true } },
        initialPayment: true,
        experiences: {
          orderBy: { startDate: 'desc' },
        },
        // include recent task submissions and pending donations for dashboard
        taskSubmissions: {
          include: { task: true },
          orderBy: { submittedAt: 'desc' },
          take: 20,
        },
        donations: {
          orderBy: { donatedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // fetch final payment separately (Prisma client may not have generated relation types locally)
    const finalPayment = await prisma.finalPayment.findUnique({
      where: { userId: user.id },
    });

    // normalize rank to a name string for frontend
    const vp = user.volunteerProfile as any | null;
    if (vp && vp.rank) {
      vp.rank = vp.rank.name ?? vp.rank;
    }

    const resultUser = { ...user, finalPayment };

    // compute social counts (followers / following)
    const followersCount = await prisma.friendList.count({ where: { friendId: user.id } });
    const followingCount = await prisma.friendList.count({ where: { userId: user.id } });

    return NextResponse.json(
      { user: { ...resultUser, followersCount, followingCount } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
