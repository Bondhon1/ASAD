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
      return NextResponse.json({ sector: updated });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = await (prisma.club.update as any)({ where: { id }, data: { isOpen } });
      return NextResponse.json({ club: updated });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
