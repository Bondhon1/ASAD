import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { publishNotification } from '@/lib/ably';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const role = String(requester.role || '').toUpperCase();
    if (role !== 'MASTER' && role !== 'ADMIN' && role !== 'DIRECTOR')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const joinReq = await (prisma as any).orgJoinRequest.findUnique({
      where: { id },
      include: { user: { include: { volunteerProfile: true } } },
    });
    if (!joinReq) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (joinReq.status !== 'PENDING')
      return NextResponse.json({ error: 'Request is already processed' }, { status: 400 });

    const body = await req.json();
    const { status, notes } = body; // APPROVED | REJECTED

    if (status !== 'APPROVED' && status !== 'REJECTED')
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    const notif = await prisma.$transaction(async (tx) => {
      await (tx as any).orgJoinRequest.update({
        where: { id },
        data: {
          status,
          notes: notes || null,
          processedById: requester.id,
          processedAt: new Date(),
        },
      });

      if (status === 'APPROVED') {
        // Add user to VolunteerProfile sectors or clubs
        const vp = joinReq.user.volunteerProfile;
        if (!vp) {
          await tx.volunteerProfile.create({
            data: {
              userId: joinReq.userId,
              sectors: joinReq.type === 'SECTOR' ? [joinReq.entityId] : [],
              clubs: joinReq.type === 'CLUB' ? [joinReq.entityId] : [],
            },
          });
        } else if (joinReq.type === 'SECTOR') {
          const current = vp.sectors || [];
          if (!current.includes(joinReq.entityId)) {
            await tx.volunteerProfile.update({
              where: { userId: joinReq.userId },
              data: { sectors: [...current, joinReq.entityId] },
            });
          }
        } else {
          const current = vp.clubs || [];
          if (!current.includes(joinReq.entityId)) {
            await tx.volunteerProfile.update({
              where: { userId: joinReq.userId },
              data: { clubs: [...current, joinReq.entityId] },
            });
          }
        }

        return tx.notification.create({
          data: {
            userId: joinReq.userId,
            type: 'ORG_JOIN_APPROVED' as any,
            title: `${joinReq.type === 'SECTOR' ? 'Sector' : 'Club'} Membership Approved`,
            message: `You have been added to ${joinReq.type === 'SECTOR' ? 'sector' : 'club'} "${joinReq.entityName}".`,
            link: '/dashboard/settings',
          },
        });
      } else {
        return tx.notification.create({
          data: {
            userId: joinReq.userId,
            type: 'ORG_JOIN_REJECTED' as any,
            title: `${joinReq.type === 'SECTOR' ? 'Sector' : 'Club'} Join Request Rejected`,
            message: `Your request to join "${joinReq.entityName}" was rejected.${notes ? ` Reason: ${notes}` : ''}`,
            link: '/dashboard/settings',
          },
        });
      }
    });

    // Push real-time notification
    try {
      const n = notif as any;
      await publishNotification(joinReq.userId, {
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        createdAt: n.createdAt,
      });
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(`PATCH /api/admin/org-join-requests/${id} error:`, err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
