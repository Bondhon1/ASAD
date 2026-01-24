import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

type Body = {
  title: string;
  description?: string;
  inputType?: 'YESNO' | 'COMMENT' | 'IMAGE' | 'DONATION';
  mandatory?: boolean;
  points?: number;
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

    const created = await prisma.task.create({
      data: {
        title: body.title.trim(),
        description: body.description || undefined,
        createdByUserId: requester.id,
        // assignedGroupType/assignedGroup are coarse here; notifications target users directly
        assignedGroupType: 'ALL',
        assignedGroup: null,
        taskType: (body.inputType || 'YESNO') as any,
        mandatory: !!body.mandatory,
        pointsPositive: typeof body.points === 'number' ? Math.max(0, Math.floor(body.points)) : 0,
        pointsNegative: 0,
        startDate,
        endDate,
      },
    });

    // Build target user set
    try {
      const assigned = body.assigned || {};
      const targetSet = new Set<string>();

      if (assigned.all) {
        const users = await prisma.user.findMany({ where: { status: 'OFFICIAL' }, select: { id: true } });
        users.forEach(u => targetSet.add(u.id));
      } else {
        if (assigned.services && assigned.services.length) {
          const users = await prisma.user.findMany({ where: { status: 'OFFICIAL', volunteerProfile: { is: { serviceId: { in: assigned.services } } } }, select: { id: true } });
          users.forEach(u => targetSet.add(u.id));
        }

        if (assigned.sectors && assigned.sectors.length) {
          const users = await prisma.user.findMany({ where: { status: 'OFFICIAL', volunteerProfile: { is: { sectors: { hasSome: assigned.sectors } } } }, select: { id: true } });
          users.forEach(u => targetSet.add(u.id));
        }

        if (assigned.clubs && assigned.clubs.length) {
          const users = await prisma.user.findMany({ where: { status: 'OFFICIAL', volunteerProfile: { is: { clubs: { hasSome: assigned.clubs } } } }, select: { id: true } });
          users.forEach(u => targetSet.add(u.id));
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

      const targetUsers = Array.from(targetSet);

      if (targetUsers.length) {
        const notifications = targetUsers.map(uId => ({ userId: uId, type: 'NEW_TASK', title: created.title, message: created.description || '', link: `/tasks/${created.id}` }));
        const chunkSize = 200;
        for (let i = 0; i < notifications.length; i += chunkSize) {
          const chunk = notifications.slice(i, i + chunkSize);
          await prisma.notification.createMany({ data: chunk });
        }
      }
    } catch (e) {
      console.error('Failed to compute/notify target users', e);
    }

    return NextResponse.json({ ok: true, task: created });
  } catch (err: any) {
    console.error('POST /api/secretaries/tasks error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
