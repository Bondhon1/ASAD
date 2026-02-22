import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// PATCH /api/admin/orgs/[id]  — toggle isOpen for a sector or club
// Body: { type: 'SECTOR' | 'CLUB', isOpen: boolean }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !['MASTER', 'ADMIN', 'DIRECTOR'].includes(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve actor for audit log
  const actor = session?.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
    : null;

  const { id } = await params;
  const body = await req.json();
  const { type, isOpen } = body as { type: 'SECTOR' | 'CLUB'; isOpen: boolean };

  if (!type || typeof isOpen !== 'boolean') {
    return NextResponse.json({ error: 'type and isOpen are required' }, { status: 400 });
  }

  try {
    if (type === 'SECTOR') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = await (prisma.sector.update as any)({ where: { id }, data: { isOpen } });
      // Audit log
      if (actor) {
        await prisma.auditLog.create({
          data: {
            actorUserId: actor.id,
            action: isOpen ? 'SECTOR_AVAILABILITY_OPENED' : 'SECTOR_AVAILABILITY_CLOSED',
            meta: JSON.stringify({ sectorId: id, sectorName: updated.name, isOpen }),
          },
        }).catch(() => {}); // non-blocking
      }
      return NextResponse.json({ sector: updated });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = await (prisma.club.update as any)({ where: { id }, data: { isOpen } });
      // Audit log
      if (actor) {
        await prisma.auditLog.create({
          data: {
            actorUserId: actor.id,
            action: isOpen ? 'CLUB_AVAILABILITY_OPENED' : 'CLUB_AVAILABILITY_CLOSED',
            meta: JSON.stringify({ clubId: id, clubName: updated.name, isOpen }),
          },
        }).catch(() => {}); // non-blocking
      }
      return NextResponse.json({ club: updated });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
