import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const role = String(requester.role || '').toUpperCase();
    if (role !== 'MASTER' && role !== 'ADMIN' && role !== 'DIRECTOR')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, parseInt(url.searchParams.get('pageSize') || '50', 10));
    const skip = (page - 1) * pageSize;

    const [requests, total] = await Promise.all([
      prisma.orgJoinRequest.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              email: true,
              volunteerId: true,
            },
          },
          processedBy: { select: { fullName: true, username: true } },
        },
        skip,
        take: pageSize,
      }),
      prisma.orgJoinRequest.count(),
    ]);

    return NextResponse.json({ requests, total, page, pageSize });
  } catch (err: any) {
    console.error('GET /api/admin/org-join-requests error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
