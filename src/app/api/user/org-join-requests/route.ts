import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// GET – list the current user's join requests
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const requests = await prisma.orgJoinRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (err: any) {
    console.error('GET /api/user/org-join-requests error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

// POST – submit a new join request
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, fullName: true, username: true, volunteerProfile: { select: { sectors: true, clubs: true } } },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { type, entityId } = body; // type: SECTOR | CLUB

    if (type !== 'SECTOR' && type !== 'CLUB')
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    if (!entityId)
      return NextResponse.json({ error: 'entityId is required' }, { status: 400 });

    // Resolve entity name
    let entityName: string | null = null;
    if (type === 'SECTOR') {
      const sector = await prisma.sector.findUnique({ where: { id: entityId }, select: { name: true, isOpen: true } });
      if (!sector) return NextResponse.json({ error: 'Sector not found' }, { status: 404 });
      if (!(sector as any).isOpen)
        return NextResponse.json({ error: 'This sector is not currently accepting applications.' }, { status: 400 });
      entityName = sector.name;

      // Check if already a member
      const alreadyMember = (user.volunteerProfile?.sectors || []).includes(entityId);
      if (alreadyMember)
        return NextResponse.json({ error: 'You are already a member of this sector' }, { status: 400 });
    } else {
      const club = await prisma.club.findUnique({ where: { id: entityId }, select: { name: true, isOpen: true } });
      if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 });
      if (!(club as any).isOpen)
        return NextResponse.json({ error: 'This club is not currently accepting applications.' }, { status: 400 });
      entityName = club.name;

      const alreadyMember = (user.volunteerProfile?.clubs || []).includes(entityId);
      if (alreadyMember)
        return NextResponse.json({ error: 'You are already a member of this club' }, { status: 400 });
    }

    // Upsert: if previously REJECTED, allow re-request
    const existing = await prisma.orgJoinRequest.findUnique({
      where: { userId_type_entityId: { userId: user.id, type, entityId } },
    });

    if (existing) {
      if (existing.status === 'PENDING')
        return NextResponse.json({ error: 'You already have a pending request for this.' }, { status: 400 });
      if (existing.status === 'APPROVED')
        return NextResponse.json({ error: 'You are already a member.' }, { status: 400 });
      // REJECTED – allow re-request by updating
      const updated = await prisma.orgJoinRequest.update({
        where: { id: existing.id },
        data: { status: 'PENDING', notes: null, processedById: null, processedAt: null, updatedAt: new Date() },
      });
      return NextResponse.json({ ok: true, request: updated });
    }

    const request = await prisma.orgJoinRequest.create({
      data: {
        userId: user.id,
        type,
        entityId,
        entityName,
        status: 'PENDING',
      },
    });

    // Notify admins / masters
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MASTER'] } },
      select: { id: true },
    });
    for (const admin of admins) {
      try {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: `${type === 'SECTOR' ? 'Sector' : 'Club'} Join Request`,
            message: `${user.fullName || user.username} requested to join ${type.toLowerCase()} "${entityName}".`,
            link: '/dashboard/admin/org-requests',
          },
        });
      } catch (e) {
        console.error('Failed to create admin notification', e);
      }
    }

    return NextResponse.json({ ok: true, request });
  } catch (err: any) {
    console.error('POST /api/user/org-join-requests error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
