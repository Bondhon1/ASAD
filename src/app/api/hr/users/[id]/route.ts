import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { invalidateAll } from '@/lib/hrUsersCache';

export async function PATCH(req: Request, context: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true, status: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['HR', 'MASTER', 'ADMIN'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
    const { points, rank, volunteerId, status, role } = body as { points?: number; rank?: string; volunteerId?: string | null; status?: string; role?: string };

    const hasPoints = typeof points === 'number';
    const hasRank = typeof rank === 'string' && rank.trim().length > 0;
    const hasVolunteerId = Object.prototype.hasOwnProperty.call(body, 'volunteerId');
    const hasStatus = Object.prototype.hasOwnProperty.call(body, 'status');
    const hasRole = Object.prototype.hasOwnProperty.call(body, 'role');

    if (!hasPoints && !hasRank && !hasVolunteerId && !hasStatus && !hasRole) return NextResponse.json({ error: 'No changes provided' }, { status: 400 });

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

    // If status change requested, update user status (handle ban/unban)
    if (hasStatus) {
      try {
        const updatedUser = await prisma.user.update({ where: { id }, data: { status: status as any } });

        // If user was banned, remove all active sessions so they are immediately logged out
        if (status === 'BANNED') {
          await prisma.session.deleteMany({ where: { userId: id } });
        }

        // Invalidate cached users list immediately so HR sees fresh data
        try { invalidateAll(); } catch (e) { /* ignore */ }

        return NextResponse.json({ ok: true, user: updatedUser });
      } catch (err: any) {
        console.error('PATCH /api/hr/users/[id] status update error', err);
        return NextResponse.json({ error: err?.message || 'Failed to update status' }, { status: 500 });
      }
    }

    // If role change requested, only ADMIN (and MASTER) can change user roles
    if (hasRole) {
      try {
        if (requester.role !== 'ADMIN' && requester.role !== 'MASTER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        // Only allow role changes when the requester is an OFFICIAL user
        if (requester.status !== 'OFFICIAL') return NextResponse.json({ error: 'Forbidden - requester must be OFFICIAL' }, { status: 403 });

        // Prevent assigning the MASTER role - it's reserved for dev/test/debug accounts
        if ((role as string)?.toUpperCase() === 'MASTER') {
          return NextResponse.json({ error: 'Forbidden - cannot assign MASTER role' }, { status: 403 });
        }

        const updatedUser = await prisma.user.update({ where: { id }, data: { role: role as any } });
        try { invalidateAll(); } catch (e) { /* ignore */ }
        return NextResponse.json({ ok: true, user: updatedUser });
      } catch (err: any) {
        console.error('PATCH /api/hr/users/[id] role update error', err);
        return NextResponse.json({ error: err?.message || 'Failed to update role' }, { status: 500 });
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

export async function DELETE(req: Request, context: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true, status: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['HR', 'MASTER', 'ADMIN'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const params = await context.params;
    let id = params?.id as string | undefined;
    if (!id) {
      try {
        const url = new URL(req.url);
        const parts = url.pathname.split('/').filter(Boolean);
        id = parts[parts.length - 1];
      } catch (e) {
        id = undefined;
      }
    }

    if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

    // Delete user — Prisma cascade rules in schema will remove related rows as configured
    await prisma.user.delete({ where: { id } });

    // Clear users cache so UI reflects the deletion immediately
    try { invalidateAll(); } catch (e) { /* ignore */ }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /api/hr/users/[id] error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
