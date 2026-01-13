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
    const { points, rank, volunteerId } = body as { points?: number; rank?: string; volunteerId?: string | null };

    const hasPoints = typeof points === 'number';
    const hasRank = typeof rank === 'string' && rank.trim().length > 0;
    const hasVolunteerId = Object.prototype.hasOwnProperty.call(body, 'volunteerId');

    if (!hasPoints && !hasRank && !hasVolunteerId) return NextResponse.json({ error: 'No changes provided' }, { status: 400 });

    // If volunteerId update requested, update User model first (to validate uniqueness)
    if (hasVolunteerId) {
      try {
        await prisma.user.update({ where: { id }, data: { volunteerId: volunteerId === null ? null : volunteerId } });
      } catch (err: any) {
        // likely uniqueness constraint or other DB error
        console.error('PATCH /api/hr/users/[id] volunteerId update error', err);
        return NextResponse.json({ error: err?.message || 'Failed to update volunteerId' }, { status: 500 });
      }
    }

    // Prepare prisma update/create payload for volunteerProfile
    const prismaDataAny: any = {};
    if (hasPoints) prismaDataAny.points = points;
    if (hasRank) {
      prismaDataAny.rank = {
        connectOrCreate: {
          where: { name: rank! },
          create: { name: rank!, thresholdPoints: 0 },
        },
      };
    }

    // If no volunteerProfile changes were requested, return success for volunteerId update
    if (!hasPoints && !hasRank) {
      // return updated user and existing profile
      const user = await prisma.user.findUnique({ where: { id }, include: { volunteerProfile: { include: { rank: true } }, initialPayment: true, finalPayment: true } });
      return NextResponse.json({ ok: true, user });
    }

    // Ensure volunteerProfile exists
    const profile = await prisma.volunteerProfile.findUnique({ where: { userId: id } });
    if (!profile) {
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
