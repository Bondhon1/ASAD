import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true, status: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['HR', 'MASTER', 'ADMIN', 'DIRECTOR', 'DATABASE_DEPT'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { name, thresholdPoints } = body as { name?: string; thresholdPoints?: number };
    if (!name || typeof thresholdPoints !== 'number') return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const rank = await prisma.rank.findUnique({ where: { name } });
    if (!rank) return NextResponse.json({ error: 'Rank not found' }, { status: 404 });

    const updated = await prisma.rank.update({ where: { name }, data: { thresholdPoints } });
    return NextResponse.json({ ok: true, rank: updated });
  } catch (err: any) {
    console.error('PATCH /api/hr/ranks error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const ranks = await prisma.rank.findMany({ orderBy: { thresholdPoints: 'asc' } });
    return NextResponse.json({ ok: true, ranks });
  } catch (err: any) {
    console.error('GET /api/hr/ranks error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
