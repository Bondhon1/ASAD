import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true, status: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['HR', 'MASTER', 'ADMIN', 'DIRECTOR'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // support search + pagination + sorting; exclude institutes with zero volunteers
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));

    const institutes = await prisma.institute.findMany({ select: { id: true, name: true } });
    const resultsAll = await Promise.all(institutes.map(async (inst) => {
      const count = await prisma.user.count({ where: { instituteId: inst.id, status: 'OFFICIAL' } });
      return { instituteId: inst.id, name: inst.name, volunteersCount: count };
    }));

    // filter out zero counts
    let filtered = resultsAll.filter(r => (r.volunteersCount || 0) > 0);
    if (q) filtered = filtered.filter(r => r.name.toLowerCase().includes(q.toLowerCase()));

    // sort desc by volunteersCount
    filtered.sort((a,b) => (b.volunteersCount || 0) - (a.volunteersCount || 0));

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    return NextResponse.json({ stats: pageItems, total, page, pageSize });
  } catch (err: any) {
    console.error('GET /api/hr/services/institute-stats error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
