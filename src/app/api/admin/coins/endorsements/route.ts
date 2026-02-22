// ═════════════════════════════════════════════════════════
// COIN MANAGEMENT DISABLED — DO NOT DELETE
// Remove the early returns in each function below to re-enable.
// ═════════════════════════════════════════════════════════
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
  // COIN MANAGEMENT DISABLED — remove this line to re-enable
  return NextResponse.json({ error: 'Feature temporarily disabled' }, { status: 503 });
  // eslint-disable-next-line no-unreachable
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = session.user.email as string;
    const requester = await prisma.user.findUnique({ where: { email } });
    if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const role = String(requester.role || '').toUpperCase();
    if (role !== 'MASTER' && role !== 'ADMIN')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const endorsements = await prisma.coinEndorsement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            phone: true,
            volunteerId: true,
            coins: true,
          },
        },
        processedBy: { select: { fullName: true, username: true } },
      },
    });

    return NextResponse.json({ endorsements });
  } catch (err: any) {
    console.error('GET /api/admin/coins/endorsements error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
