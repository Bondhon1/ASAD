import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status');
    const isOfficialParam = url.searchParams.get('isOfficial');
    const q = url.searchParams.get('q') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));

    const where: any = {};

    if (statusParam) {
      if (statusParam === 'UNOFFICIAL') {
        where.NOT = { status: 'OFFICIAL' };
      } else {
        where.status = statusParam;
      }
    }

    if (isOfficialParam === 'true') {
      where.volunteerProfile = { isOfficial: true };
    }

    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { volunteerId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * pageSize;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          volunteerProfile: true,
          institute: { select: { name: true } },
          taskSubmissions: { include: { task: true } },
          donations: true,
          initialPayment: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({ users, total, page, pageSize });
  } catch (err: any) {
    console.error('GET /api/hr/users error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
