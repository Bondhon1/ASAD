import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';
import { parseAudience, resolveAudienceUserIds } from '@/lib/taskAudience';

async function enrichAssignedWithNames(assigned: any) {
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
  };
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true } });
    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['SECRETARIES', 'MASTER', 'ADMIN', 'DIRECTOR'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    // ensure task exists first
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // delete related notifications first
    await prisma.notification.deleteMany({ where: { link: `/tasks/${id}` } });
    const deleted = await prisma.task.delete({ where: { id } });

    // Write an audit log entry for the deletion (best-effort)
    try {
      await prisma.auditLog.create({
        data: {
          actorUserId: requester.id,
          action: 'DELETE_TASK',
          meta: JSON.stringify({ id: deleted.id, title: deleted.title, targetUserCount: deleted.targetUserIds?.length ?? 0 }),
          points: deleted.pointsNegative ?? undefined,
        },
      });
    } catch (e: any) {
      console.error('Failed to write AuditLog for DELETE /api/secretaries/tasks/[id]:', e?.message || e);
    }

    return NextResponse.json({ ok: true, task: deleted });
  } catch (err: any) {
    console.error('DELETE /api/secretaries/tasks/[id] error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true } });
    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['SECRETARIES', 'MASTER', 'ADMIN', 'DIRECTOR'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();

    const oldTask = await prisma.task.findUnique({ where: { id } });
    if (!oldTask) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const data: any = {};
    if (typeof body.title === 'string') data.title = body.title;
    if (typeof body.description === 'string') data.description = body.description;
    
    // Parse dates as Dhaka timezone (UTC+6) if no timezone specified
    const parseDhakaDate = (dateStr: string): Date => {
      if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        return new Date(dateStr + '+06:00');
      }
      return new Date(dateStr);
    };
    
    let newEndDate: Date | null = null;
    if (body.expireAt) {
      newEndDate = parseDhakaDate(body.expireAt);
      data.endDate = newEndDate;
    } else if (body.endDate) {
      newEndDate = parseDhakaDate(body.endDate);
      data.endDate = newEndDate;
    }

    if (typeof body.pointsPositive === 'number') data.pointsPositive = Math.max(0, Math.floor(body.pointsPositive));
    if (typeof body.points === 'number') data.pointsPositive = Math.max(0, Math.floor(body.points)); // handle both
    
    if (typeof body.pointsToDeduct === 'number') data.pointsNegative = Math.max(0, Math.floor(body.pointsToDeduct));
    if (typeof body.pointsNegative === 'number') data.pointsNegative = Math.max(0, Math.floor(body.pointsNegative)); // handle both

    // Only MASTER can update APC credit
    if (requester.role === 'MASTER' && typeof body.credit === 'number') {
      data.credit = Math.max(0, Math.floor(body.credit));
    }

    if (typeof body.mandatory === 'boolean') data.mandatory = body.mandatory;
    
    if (typeof body.taskType === 'string') data.taskType = body.taskType;
    if (typeof body.inputType === 'string') data.taskType = body.inputType; // handle both

    const oldAudience = parseAudience(oldTask.assignedGroup);
    const oldAudienceIds = await resolveAudienceUserIds(oldAudience, { fallbackTargetIds: oldTask.targetUserIds });

    let targetUsers = oldAudienceIds;
    let audienceChanged = false;

    if (body.assigned) {
      audienceChanged = true;
      const assigned = await enrichAssignedWithNames(body.assigned);
      targetUsers = await resolveAudienceUserIds(assigned, { fallbackTargetIds: oldTask.targetUserIds });
      data.targetUserIds = [];
      data.assignedGroup = JSON.stringify(assigned || {});
      data.assignedGroupType = assigned?.all ? 'ALL' : 'SECTOR';
    }

    const updated = await prisma.task.update({ where: { id }, data });

    // Handle Notifications (not broadcast)
    const newAudienceIds = targetUsers.filter(uId => !oldAudienceIds.includes(uId));
    if (newAudienceIds.length > 0) {
      await prisma.notification.createMany({
        data: newAudienceIds.map(uId => ({
          userId: uId,
          broadcast: false,
          type: NotificationType.NEW_TASK,
          title: 'New assignment: ' + updated.title,
          message: updated.description ? (updated.description.slice(0, 100) + (updated.description.length > 100 ? '...' : '')) : 'You have a new task assigned.',
          link: '/dashboard/tasks'
        }))
      });
    }

    const isDeadlineExtended = newEndDate && newEndDate.getTime() > oldTask.endDate.getTime();
    if (isDeadlineExtended) {
      // Notify all target users (the ones that were already there and the new ones, not broadcast)
      await prisma.notification.createMany({
        data: targetUsers.map(uId => ({
          userId: uId,
          broadcast: false,
          type: NotificationType.APPLICATION_UPDATE,
          title: 'Deadline extended: ' + updated.title,
          message: `The deadline has been extended to ${newEndDate!.toLocaleString()}.`,
          link: '/dashboard/tasks'
        }))
      });
    }

    return NextResponse.json({ ok: true, task: updated });
  } catch (err: any) {
    console.error('PATCH /api/secretaries/tasks/[id] error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
