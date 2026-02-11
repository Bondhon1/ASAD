import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, status: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Return tasks where the requester is in the Task.targetUserIds list (and task is active).
    const now = new Date();
    const tasks = await prisma.task.findMany({ where: { targetUserIds: { has: requester.id }, startDate: { lte: now }, endDate: { gte: now } }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(
      { tasks },
      {
        headers: {
          // Cache for 30 seconds - tasks are dynamic
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err: any) {
    console.error('GET /api/tasks error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
