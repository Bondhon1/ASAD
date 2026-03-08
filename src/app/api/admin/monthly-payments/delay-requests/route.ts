import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['MASTER', 'ADMIN', 'HR'];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });
    if (!admin || !ADMIN_ROLES.includes(admin.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status && status !== 'all') where.status = status;

    const requests = await prisma.monthlyPaymentDelayRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            volunteerId: true,
            email: true,
            institute: { select: { name: true } },
          },
        },
        reviewedBy: { select: { fullName: true, volunteerId: true } },
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('[admin/monthly-payments/delay-requests GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

