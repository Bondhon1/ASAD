import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { parseAudience, isUserInAudience } from '@/lib/taskAudience';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        status: true,
        volunteerProfile: {
          select: {
            serviceId: true,
            service: { select: { name: true } },
            sectors: true,
            clubs: true,
          },
        },
      },
    });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Return tasks where the requester matches the audience (computed at runtime) and task is active.
    const now = new Date();
    const tasks = await prisma.task.findMany({
      where: { startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        title: true,
        description: true,
        taskType: true,
        mandatory: true,
        pointsPositive: true,
        pointsNegative: true,
        credit: true,
        startDate: true,
        endDate: true,
        assignedGroupType: true,
        assignedGroup: true,
        targetUserIds: true,
        attachments: true,
        createdAt: true,
      },
    });
    const visible = tasks.filter((t) =>
      isUserInAudience(parseAudience(t.assignedGroup), {
        id: requester.id,
        status: requester.status,
        volunteerProfile: requester.volunteerProfile as any,
      }, t.targetUserIds)
    );
    return NextResponse.json(
      { tasks: visible },
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
