import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true, status: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['SECRETARIES', 'HR', 'MASTER', 'ADMIN', 'DIRECTOR'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { title, description, expireAt, points, mandatory, inputType, restriction } = body as { title?: string; description?: string; expireAt?: string; points?: number; mandatory?: boolean; inputType?: string; restriction?: 'ALL'|'SERVICE'|'SECTOR' };
    if (!title || !expireAt) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const endDate = new Date(expireAt);
    const now = new Date();

    const task = await prisma.task.create({ data: {
      title,
      description: description || undefined,
      createdByUserId: requester.id,
      assignedGroupType: restriction === 'SERVICE' ? 'SECTOR' : (restriction === 'SECTOR' ? 'SECTOR' : 'ALL'),
      assignedGroup: null,
      taskType: (inputType === 'COMMENT' ? 'COMMENT' : inputType === 'IMAGE' ? 'IMAGE' : 'YESNO'),
      mandatory: !!mandatory,
      pointsPositive: typeof points === 'number' ? Math.max(0, Math.floor(points)) : 0,
      pointsNegative: 0,
      startDate: now,
      endDate,
    } });

    return NextResponse.json({ ok: true, task });
  } catch (err: any) {
    console.error('POST /api/secretaries/tasks error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
