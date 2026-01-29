import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true } });
    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['SECRETARIES', 'MASTER', 'ADMIN', 'DIRECTOR'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    // delete related notifications first
    await prisma.notification.deleteMany({ where: { link: `/tasks/${id}` } });
    const deleted = await prisma.task.delete({ where: { id } });

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
    
    if (typeof body.mandatory === 'boolean') data.mandatory = body.mandatory;
    
    if (typeof body.taskType === 'string') data.taskType = body.taskType;
    if (typeof body.inputType === 'string') data.taskType = body.inputType; // handle both

    let targetUsers = oldTask.targetUserIds;
    let audienceChanged = false;

    if (body.assigned) {
      audienceChanged = true;
      const assigned = body.assigned;
      const targetSet = new Set<string>();
      if (assigned.all) {
        const users = await prisma.user.findMany({ 
          where: { status: 'OFFICIAL' }, 
          select: { id: true } 
        });
        users.forEach(u => targetSet.add(u.id));
      } else {
        if (assigned.services && assigned.services.length) {
          const profiles = await prisma.volunteerProfile.findMany({ 
            where: { serviceId: { in: assigned.services } }, 
            select: { userId: true } 
          });
          const uids = profiles.map(p => p.userId);
          if (uids.length) {
            const users = await prisma.user.findMany({ 
              where: { id: { in: uids }, status: 'OFFICIAL' }, 
              select: { id: true } 
            });
            users.forEach(u => targetSet.add(u.id));
          }
        }
        if (assigned.sectors && assigned.sectors.length) {
          // VolunteerProfile.sectors stores sector IDs. Match directly by IDs.
          const sectorIds = assigned.sectors.filter(Boolean);
          if (sectorIds.length) {
            const profiles = await prisma.volunteerProfile.findMany({
              where: { sectors: { hasSome: sectorIds } },
              select: { userId: true },
            });
            const uids = profiles.map((p) => p.userId);
            if (uids.length) {
              const users = await prisma.user.findMany({
                where: {
                  AND: [
                    { id: { in: uids } },
                    { OR: [{ status: 'OFFICIAL' }, { id: requester.id }] },
                  ],
                },
                select: { id: true },
              });
              users.forEach((u) => targetSet.add(u.id));
            }
          }
        }
        if (assigned.clubs && assigned.clubs.length) {
          // volunteerProfile.clubs stores club IDs. Match directly by IDs.
          const clubIds = assigned.clubs.filter(Boolean);
          if (clubIds.length) {
            const profiles = await prisma.volunteerProfile.findMany({
              where: { clubs: { hasSome: clubIds } },
              select: { userId: true },
            });
            const uids = profiles.map((p) => p.userId);
            if (uids.length) {
              const users = await prisma.user.findMany({
                where: {
                  AND: [
                    { id: { in: uids } },
                    { OR: [{ status: 'OFFICIAL' }, { id: requester.id }] },
                  ],
                },
                select: { id: true },
              });
              users.forEach((u) => targetSet.add(u.id));
            }
          }
        }
        if (assigned.committees && assigned.committees.length) {
          const members = await prisma.committeeMember.findMany({ 
            where: { committeeId: { in: assigned.committees } }, 
            select: { userId: true } 
          });
          const uids = members.map(m => m.userId);
          const users = await prisma.user.findMany({ 
            where: { id: { in: uids }, status: 'OFFICIAL' }, 
            select: { id: true } 
          });
          users.forEach(u => targetSet.add(u.id));
        }
        if (assigned.departments && assigned.departments.length) {
          const committees = await prisma.committee.findMany({ 
            where: { departmentId: { in: assigned.departments } }, 
            include: { members: true } 
          });
          const uids = committees.flatMap(c => c.members).map(m => m.userId);
          const users = await prisma.user.findMany({ 
            where: { id: { in: uids }, status: 'OFFICIAL' }, 
            select: { id: true } 
          });
          users.forEach(u => targetSet.add(u.id));
        }
      }
      targetUsers = Array.from(targetSet);
      data.targetUserIds = targetUsers;
      data.assignedGroup = JSON.stringify(assigned);
      data.assignedGroupType = assigned.all ? 'ALL' : 'SECTOR';
    }

    const updated = await prisma.task.update({ where: { id }, data });

    // Handle Notifications
    const newAudienceIds = targetUsers.filter(uId => !oldTask.targetUserIds.includes(uId));
    if (newAudienceIds.length > 0) {
      await prisma.notification.createMany({
        data: newAudienceIds.map(uId => ({
          userId: uId,
          type: NotificationType.NEW_TASK,
          title: 'New assignment: ' + updated.title,
          message: updated.description ? (updated.description.slice(0, 100) + (updated.description.length > 100 ? '...' : '')) : 'You have a new task assigned.',
          link: '/dashboard/tasks'
        }))
      });
    }

    const isDeadlineExtended = newEndDate && newEndDate.getTime() > oldTask.endDate.getTime();
    if (isDeadlineExtended) {
      // Notify all target users (the ones that were already there and the new ones)
      await prisma.notification.createMany({
        data: targetUsers.map(uId => ({
          userId: uId,
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
