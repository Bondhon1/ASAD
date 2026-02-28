import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { publishNotification } from '@/lib/ably';
import { NotificationType } from '@prisma/client';
import { resolveAudienceUserIds } from '@/lib/taskAudience';

type Body = {
  title: string;
  description?: string;
  inputType?: 'YESNO' | 'COMMENT' | 'IMAGE' | 'DONATION';
  mandatory?: boolean;
  points?: number;
  pointsToDeduct?: number;
  credit?: number;
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

async function enrichAssignedWithNames(assigned: Body['assigned'] | undefined) {
  const a = assigned || {};
  const [services, sectors, clubs] = await Promise.all([
    a?.services?.length
      ? prisma.service.findMany({ where: { id: { in: a.services } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    a?.sectors?.length
      ? prisma.sector.findMany({ where: { id: { in: a.sectors } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    a?.clubs?.length
      ? prisma.club.findMany({ where: { id: { in: a.clubs } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);

  return {
    ...a,
    serviceNames: services.map((s) => s.name),
    sectorNames: sectors.map((s) => s.name),
    clubNames: clubs.map((c) => c.name),
  } as Body['assigned'] & { serviceNames?: string[]; sectorNames?: string[]; clubNames?: string[] };
}

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
    
    // Parse expireAt as Dhaka timezone (UTC+6) if no timezone specified
    let endDate: Date;
    if (body.expireAt) {
      // If the date string doesn't have timezone info, treat it as Dhaka time (UTC+6)
      const dateStr = body.expireAt;
      if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        // Append Dhaka timezone offset (+06:00)
        endDate = new Date(dateStr + '+06:00');
      } else {
        endDate = new Date(dateStr);
      }
    } else {
      endDate = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    }

    // Build target user set BEFORE creating task so we can persist it to the task row
    const assigned = await enrichAssignedWithNames(body.assigned);
    let targetUsers: string[] = [];
    try {
      targetUsers = await resolveAudienceUserIds(assigned || {});
      // Never notify the creator — they are creating the task, not assigned to it
      targetUsers = targetUsers.filter(id => id !== requester.id);
    } catch (e) {
      console.error('Failed to compute target users', e);
    }
    

    // Now create the task and save the explicit target list
    const created = await prisma.task.create({
      data: {
        title: body.title.trim(),
        description: body.description || undefined,
        createdByUserId: requester.id,
        assignedGroupType: assigned?.all ? 'ALL' : 'SECTOR', // using SECTOR as a fallback for multiple
        assignedGroup: JSON.stringify(assigned),
        targetUserIds: [],
        taskType: (body.inputType || 'YESNO') as any,
        mandatory: !!body.mandatory,
        pointsPositive: typeof body.points === 'number' ? Math.max(0, Math.floor(body.points)) : 0,
        pointsNegative: (body.mandatory && typeof body.pointsToDeduct === 'number') ? Math.max(0, Math.floor(body.pointsToDeduct)) : 0,
        // Only MASTER can set APC credit on a task
        credit: (requester.role === 'MASTER' && typeof body.credit === 'number') ? Math.max(0, Math.floor(body.credit)) : 0,
        startDate,
        endDate,
      },
    });

    // Produce notifications for target users and publish them in real-time
    let totalNotificationsCreated = 0;
    try {
      if (targetUsers.length) {
        const messagePreview = created.description ? (created.description.slice(0, 100) + (created.description.length > 100 ? '...' : '')) : 'You have a new task assigned. Please check your Dashboard.';
        const link = `/dashboard/tasks`;

        for (const uId of targetUsers) {
          try {
            const notification = await prisma.notification.create({
              data: {
                userId: uId,
                broadcast: false,
                type: NotificationType.NEW_TASK,
                title: 'New assignment: ' + created.title,
                message: messagePreview,
                link,
              },
            });

            totalNotificationsCreated += 1;

            // Publish real-time notification via Ably (if configured)
            try {
              await publishNotification(uId, {
                id: notification.id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                link: notification.link,
                createdAt: notification.createdAt,
              });
            } catch (pubErr) {
              console.error('Failed to publish notification for user', uId, pubErr);
            }
          } catch (createErr) {
            console.error('Failed to create notification for user', uId, createErr);
          }
        }
      } else {
        // no target users
      }
    } catch (e) {
      console.error('Failed to notify target users', e);
    }

    // Create audit log for task creation
    await prisma.auditLog.create({
      data: {
        actorUserId: requester.id,
        action: 'TASK_CREATED',
        meta: JSON.stringify({
          taskId: created.id,
          taskTitle: created.title,
          targetUsersCount: targetUsers.length,
          points: created.pointsPositive,
          mandatory: created.mandatory,
          assignedGroup: created.assignedGroup,
        }),
        points: created.pointsPositive || undefined,
      },
    });

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
      return NextResponse.json(
        { tasks },
        {
          headers: {
            'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
          },
        }
      );
    }

    // Otherwise return tasks created by the requester
    const tasks = await prisma.task.findMany({ where: { createdByUserId: requester.id }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(
      { tasks },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err: any) {
    console.error('GET /api/secretaries/tasks error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
