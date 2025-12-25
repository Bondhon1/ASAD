import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, context: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true, status: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['HR', 'MASTER'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // `params` may be a Promise in Next.js app routes — await it safely
    const params = await context.params;
    let id = params?.id as string | undefined;
    if (!id) {
      // fallback: extract last path segment from URL
      try {
        const url = new URL(req.url);
        const parts = url.pathname.split('/').filter(Boolean);
        id = parts[parts.length - 1];
      } catch (e) {
        id = undefined;
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }
    const body = await req.json();
    const { points, rank } = body as { points?: number; rank?: string };

    const hasPoints = typeof points === 'number';
    const hasRank = typeof rank === 'string' && rank.trim().length > 0;

    if (!hasPoints && !hasRank) return NextResponse.json({ error: 'No changes provided' }, { status: 400 });

    // Prepare prisma update/create payload
    const prismaDataAny: any = {};
    if (hasPoints) prismaDataAny.points = points;
    if (hasRank) {
      // rank is a relation to Rank model; use connectOrCreate by name
      prismaDataAny.rank = {
        connectOrCreate: {
          where: { name: rank! },
          create: { name: rank!, thresholdPoints: 0 },
        },
      };
    }

    // Ensure volunteerProfile exists
    const profile = await prisma.volunteerProfile.findUnique({ where: { userId: id } });
    if (!profile) {
      // create profile with provided values (including nested rank)
      const createData: any = { userId: id, points: hasPoints ? points : 0 };
      if (hasRank) createData.rank = prismaDataAny.rank;
      const created = await prisma.volunteerProfile.create({ data: createData, include: { rank: true } });
      return NextResponse.json({ ok: true, profile: created });
    }

    const updated = await prisma.volunteerProfile.update({ where: { userId: id }, data: prismaDataAny, include: { rank: true } });
    return NextResponse.json({ ok: true, profile: updated });
  } catch (err: any) {
    console.error('PATCH /api/hr/users/[id] error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
