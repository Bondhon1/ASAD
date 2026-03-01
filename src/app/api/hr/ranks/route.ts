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

    // Check if rank exists first - do NOT create new ranks via this endpoint
    const existingRank = await prisma.rank.findUnique({ where: { name } });
    if (!existingRank) {
      return NextResponse.json({ error: `Rank "${name}" not found. Ranks are predefined and cannot be created via this endpoint.` }, { status: 404 });
    }

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

    const rank = await prisma.rank.update({
      where: { name },
      data: updateData,
    });
    return NextResponse.json({ ok: true, rank });
  } catch (err: any) {
    console.error('PATCH /api/hr/ranks error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // fetch ranks without explicit ordering so the database's natural/storage order is preserved
    const ranks = await prisma.rank.findMany({
      select: { id: true, name: true, thresholdPoints: true, description: true, parentId: true },
    });

    // Build a canonical ordering based on business rules (hardcoded sequence)
    const desiredOrder = [
      { name: 'VOLUNTEER' },
      { name: 'Aspiring Volunteer' },
      { name: 'Ready to Serve (RS)' },
      { name: 'Mentor' },
      { name: 'Dedicated Volunteer', children: ['Dedicated Volunteer *', 'Dedicated Volunteer **'] },
      { name: 'Ability to Lead (AL)', children: ['Ability to Lead (AL) *', 'Ability to Lead (AL) **', 'Ability to Lead (AL) ***'] },
      { name: 'Deputy Commander (DC)', children: ['Deputy Commander (DC) *', 'Deputy Commander (DC) **'] },
      { name: 'Commander', children: ['Commander *', 'Commander **', 'Commander ***'] },
      { name: 'Asadian Star', children: ['Asadian Star (AS) *', 'Asadian Star (AS) **'] },
      { name: 'General Volunteer (GV)' },
      { name: 'Senior Volunteer' },
      { name: 'Senior Commander' },
      { name: 'Community Builder' },
      { name: 'Strategic Leader' },
      { name: 'Adviser' },
    ];

    const normalize = (s: any) => (s || '').toString().replace(/[\s\uFEFF\u00A0]+/g, ' ').trim().toLowerCase();
    const byId = new Map(ranks.map((r: any) => [r.id, r]));
    const byName = new Map(ranks.map((r: any) => [normalize(r.name), r]));

    const ordered: any[] = [];
    const added = new Set<string>();

    const pushRank = (r: any) => {
      if (!r || added.has(r.id)) return;
      ordered.push(r);
      added.add(r.id);
    };

    // helper to find by name fuzzily
    const findByName = (target: string) => {
      if (!target) return null;
      const n = normalize(target.replace(/[★\*]/g, ''));
      if (byName.has(n)) return byName.get(n);
      // try contains match
      for (const r of ranks) {
        if (normalize(r.name).includes(n)) return r;
      }
      return null;
    };

    for (const item of desiredOrder) {
      const parent = findByName(item.name);
      if (parent) pushRank(parent);
      if (Array.isArray(item.children) && parent) {
        for (const childName of item.children) {
          let c: any = null;
          const childNorm = normalize(childName);
          // try exact normalized match (preserves stars if present)
          if (byName.has(childNorm)) c = byName.get(childNorm);

          // try to find among parent's children by matching base name (without stars)
          if (!c) {
            const childBase = normalize(childName.replace(/[★\*]/g, ''));
            c = ranks.find((x: any) => x.parentId === parent.id && normalize(x.name).includes(childBase));
          }

          // final fallback: fuzzy find but avoid returning the parent itself
          if (!c) {
            const f = findByName(childName);
            if (f && f.id !== parent.id) c = f;
          }

          if (c) pushRank(c);
        }
      }
    }

    // append any remaining ranks in DB order
    for (const r of ranks) {
      if (!added.has(r.id)) pushRank(r);
    }

    // mark ranks that have children as non-selectable categories
    const hasChildren = new Set(ranks.map((r: any) => r.parentId).filter(Boolean));
    const ranksWithSelectable = ordered.map((r: any) => ({
      ...r,
      parent: r.parentId ? { id: r.parentId, name: byId.get(r.parentId)?.name || null } : null,
      selectable: !hasChildren.has(r.id),
    }));
    const dropdownRanks = ranksWithSelectable.filter((r: any) => r.selectable);

    return NextResponse.json(
      { ok: true, ranks: ranksWithSelectable, dropdownRanks },
      {
        headers: {
          // Cache for 5 minutes - ranks rarely change
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err: any) {
    console.error('GET /api/hr/ranks error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
