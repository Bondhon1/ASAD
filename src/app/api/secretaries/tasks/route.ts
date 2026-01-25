import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';

type Body = {
  title: string;
  description?: string;
  inputType?: 'YESNO' | 'COMMENT' | 'IMAGE' | 'DONATION';
  mandatory?: boolean;
  points?: number;
  pointsToDeduct?: number;
  expireAt?: string;
  assigned?: {
    services?: string[]; // service ids
    sectors?: string[]; // sector ids
    clubs?: string[]; // club ids
    committees?: string[]; // committee ids
    departments?: string[]; // department ids
    all?: boolean;
  };
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true, status: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['SECRETARIES', 'HR', 'MASTER', 'ADMIN', 'DIRECTOR'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = (await req.json()) as Body;
    if (!body.title || !body.title.trim()) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

    const now = new Date();
    const startDate = now;
    const endDate = body.expireAt ? new Date(body.expireAt) : new Date(now.getTime() + 7 * 24 * 3600 * 1000);

    // Build target user set BEFORE creating task so we can persist it to the task row
    const assigned = body.assigned || {};
    const targetSet = new Set<string>();
    try {
      if (assigned.all) {
        const users = await prisma.user.findMany({ where: { status: 'OFFICIAL' }, select: { id: true } });
        users.forEach(u => targetSet.add(u.id));
      } else {
        if (assigned.services && assigned.services.length) {
          const profiles = await prisma.volunteerProfile.findMany({ where: { serviceId: { in: assigned.services } }, select: { userId: true } });
          const uids = profiles.map(p => p.userId);
          if (uids.length) {
            const users = await prisma.user.findMany({ where: { id: { in: uids }, status: 'OFFICIAL' }, select: { id: true } });
            users.forEach(u => targetSet.add(u.id));
          }
        }

        if (assigned.sectors && assigned.sectors.length) {
          const profiles = await prisma.volunteerProfile.findMany({ where: { sectors: { hasSome: assigned.sectors } }, select: { userId: true } });
          const uids = profiles.map(p => p.userId);
          if (uids.length) {
            const users = await prisma.user.findMany({ where: { id: { in: uids }, status: 'OFFICIAL' }, select: { id: true } });
            users.forEach(u => targetSet.add(u.id));
          }
        }

        if (assigned.clubs && assigned.clubs.length) {
          const profiles = await prisma.volunteerProfile.findMany({ where: { clubs: { hasSome: assigned.clubs } }, select: { userId: true } });
          const uids = profiles.map(p => p.userId);
          if (uids.length) {
            const users = await prisma.user.findMany({ where: { id: { in: uids }, status: 'OFFICIAL' }, select: { id: true } });
            users.forEach(u => targetSet.add(u.id));
          }
        }

        if (assigned.committees && assigned.committees.length) {
          const members = await prisma.committeeMember.findMany({ where: { committeeId: { in: assigned.committees } }, select: { userId: true } });
          members.forEach(m => targetSet.add(m.userId));
        }

        if (assigned.departments && assigned.departments.length) {
          const committees = await prisma.committee.findMany({ where: { departmentId: { in: assigned.departments } }, include: { members: true } });
          committees.flatMap(c => c.members).forEach(m => targetSet.add(m.userId));
        }
      }
    } catch (e) {
      console.error('Failed to compute target users', e);
    }

    const targetUsers = Array.from(targetSet);
    console.info('[secretaries/tasks] matched target user count:', targetUsers.length);

    // Now create the task and save the explicit target list
    const created = await prisma.task.create({
      data: {
        title: body.title.trim(),
        description: body.description || undefined,
        createdByUserId: requester.id,
        assignedGroupType: 'ALL',
        assignedGroup: null,
        targetUserIds: targetUsers,
        taskType: (body.inputType || 'YESNO') as any,
        mandatory: !!body.mandatory,
        pointsPositive: typeof body.points === 'number' ? Math.max(0, Math.floor(body.points)) : 0,
        pointsNegative: (body.mandatory && typeof body.pointsToDeduct === 'number') ? Math.max(0, Math.floor(body.pointsToDeduct)) : 0,
        startDate,
        endDate,
      },
    });

    // Produce notifications for target users
    let totalNotificationsCreated = 0;
    try {
      if (targetUsers.length) {
        const notifications = targetUsers.map(uId => ({ userId: uId, type: NotificationType.NEW_TASK, title: 'New task for you.', message: created.description || 'You have a new task assigned. Please check your Tasks.', link: `/tasks/${created.id}` }));
        const chunkSize = 200;
        for (let i = 0; i < notifications.length; i += chunkSize) {
          const chunk = notifications.slice(i, i + chunkSize);
          try {
            const res = await prisma.notification.createMany({ data: chunk });
            // @ts-ignore
            totalNotificationsCreated += (res?.count || 0);
          } catch (chunkErr) {
            console.error('Failed to insert notification chunk', chunkErr);
          }
        }
        console.info('[secretaries/tasks] notifications created:', totalNotificationsCreated);
      } else {
        console.info('[secretaries/tasks] no target users found for assigned:', assigned);
      }
    } catch (e) {
      console.error('Failed to notify target users', e);
    }

    return NextResponse.json({ ok: true, task: created, notificationsCreated: totalNotificationsCreated });
  } catch (err: any) {
    console.error('POST /api/secretaries/tasks error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true, status: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const all = url.searchParams.get('all');

    // If ?all=1 is requested, only allow SECRETARIES or MASTER to fetch all tasks
    if (all === '1') {
      if (!['SECRETARIES', 'MASTER'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const tasks = await prisma.task.findMany({ orderBy: { createdAt: 'desc' } });
      return NextResponse.json({ tasks });
    }

    // Otherwise return tasks created by the requester
    const tasks = await prisma.task.findMany({ where: { createdByUserId: requester.id }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ tasks });
  } catch (err: any) {
    console.error('GET /api/secretaries/tasks error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
