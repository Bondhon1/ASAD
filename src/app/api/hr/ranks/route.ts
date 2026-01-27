import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true, status: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['HR', 'MASTER', 'ADMIN', 'DIRECTOR', 'DATABASE_DEPT'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { name, thresholdPoints, description, parentId } = body as { name?: string; thresholdPoints?: number; description?: string; parentId?: string | null };
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

    const updateData: any = {};
    if (typeof thresholdPoints === 'number') updateData.thresholdPoints = thresholdPoints;
    if (typeof description === 'string') updateData.description = description;
    if (parentId !== undefined) {
      if (parentId === null) {
        updateData.parent = { disconnect: true };
      } else {
        updateData.parent = { connect: { id: parentId } };
      }
    }

    const createData: any = {
      name,
      thresholdPoints: typeof thresholdPoints === 'number' ? thresholdPoints : 0,
      description: typeof description === 'string' ? description : null,
    };
    if (parentId) createData.parent = { connect: { id: parentId } };

    const rank = await prisma.rank.upsert({
      where: { name },
      update: updateData,
      create: createData,
    });
    return NextResponse.json({ ok: true, rank });
  } catch (err: any) {
    console.error('PATCH /api/hr/ranks error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const ranks = await prisma.rank.findMany({ 
      select: { id: true, name: true, createdAt: true, description: true, thresholdPoints: true, parentId: true },
      orderBy: { thresholdPoints: 'asc' } 
    });

    // mark ranks that have children as non-selectable categories
    const hasChildren = new Set(ranks.map(r => r.parentId).filter(Boolean));
    const ranksWithSelectable = ranks.map(r => ({ ...r, selectable: !hasChildren.has(r.id) }));
    const dropdownRanks = ranksWithSelectable.filter(r => r.selectable);

    return NextResponse.json({ ok: true, ranks: ranksWithSelectable, dropdownRanks });
  } catch (err: any) {
    console.error('GET /api/hr/ranks error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
