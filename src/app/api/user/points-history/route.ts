import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Ordered rank progression (same as rankUtils.ts RANK_SEQUENCE)
const RANK_SEQUENCE = [
  'VOLUNTEER',
  'Aspiring Volunteer',
  'Ready to Serve (RS)',
  'Mentor',
  'Dedicated Volunteer *',
  'Dedicated Volunteer **',
  'Ability to Lead (AL) *',
  'Ability to Lead (AL) **',
  'Ability to Lead (AL) ***',
  'Deputy Commander (DC) *',
  'Deputy Commander (DC) **',
  'Commander *',
  'Commander **',
  'Commander ***',
  'Asadian Star (AS) *',
  'Asadian Star (AS) **',
  'General Volunteer (GV)',
  'Senior Volunteer',
  'Senior Commander',
  'Community Builder',
  'Strategic Leader',
  'Adviser',
];

const PARENT_ONLY_RANKS = [
  'Dedicated Volunteer',
  'Ability to Lead (AL)',
  'Deputy Commander (DC)',
  'Commander',
  'Asadian Star',
];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        volunteerProfile: {
          select: {
            points: true,
            rank: { select: { id: true, name: true, thresholdPoints: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch points history (most recent 50)
    const history = await prisma.pointsHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        change: true,
        reason: true,
        createdAt: true,
        relatedTask: { select: { id: true, title: true } },
        relatedDonation: { select: { id: true, amount: true } },
      },
    });

    // Fetch all ranks ordered by threshold
    const allRanks = await prisma.rank.findMany({
      orderBy: { thresholdPoints: 'asc' },
      select: { id: true, name: true, thresholdPoints: true, parentId: true },
    });

    // Filter to only assignable ranks (exclude parent-only)
    const assignableRanks = allRanks.filter(
      (r) => !PARENT_ONLY_RANKS.includes(r.name)
    );

    // Sort assignable ranks by RANK_SEQUENCE order
    const sortedRanks = [...assignableRanks].sort((a, b) => {
      const ai = RANK_SEQUENCE.findIndex(
        (s) => s.toLowerCase() === a.name.trim().toLowerCase()
      );
      const bi = RANK_SEQUENCE.findIndex(
        (s) => s.toLowerCase() === b.name.trim().toLowerCase()
      );
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    const currentRank = user.volunteerProfile?.rank ?? null;
    const currentPoints = user.volunteerProfile?.points ?? 0;

    // Find current rank index in sorted sequence
    const currentRankIndex = currentRank
      ? sortedRanks.findIndex(
          (r) => r.name.trim().toLowerCase() === currentRank.name.trim().toLowerCase()
        )
      : -1;

    // Current rank threshold = threshold points of current rank
    const currentRankThreshold = currentRank?.thresholdPoints ?? 0;

    // Next rank in sequence (skip Adviser auto-upgrade)
    let nextRank: { name: string; thresholdPoints: number } | null = null;
    if (currentRankIndex >= 0 && currentRankIndex < sortedRanks.length - 1) {
      const candidate = sortedRanks[currentRankIndex + 1];
      if (candidate.name !== 'Adviser') {
        nextRank = { name: candidate.name, thresholdPoints: candidate.thresholdPoints };
      }
    }

    return NextResponse.json({
      history,
      currentPoints,
      currentRankName: currentRank?.name ?? null,
      currentRankThreshold,
      nextRankName: nextRank?.name ?? null,
      nextRankThreshold: nextRank?.thresholdPoints ?? null,
      rankSequence: sortedRanks.map((r) => ({
        name: r.name,
        thresholdPoints: r.thresholdPoints,
      })),
    });
  } catch (err) {
    console.error('[points-history] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
