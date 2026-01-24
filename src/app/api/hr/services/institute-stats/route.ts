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

    // Return volunteer counts per institute (OFFICIAL users)
    const institutes = await prisma.institute.findMany({ select: { id: true, name: true } });

    const results = await Promise.all(institutes.map(async (inst) => {
      const count = await prisma.user.count({ where: { instituteId: inst.id, status: 'OFFICIAL' } });
      return { instituteId: inst.id, name: inst.name, volunteersCount: count };
    }));

    return NextResponse.json({ stats: results });
  } catch (err: any) {
    console.error('GET /api/hr/services/institute-stats error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
