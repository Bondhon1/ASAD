import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

/** GET /api/credits/history — Get user's manual credit transaction history */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user)
      return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Fetch all manual credit adjustments for this user
    const transactions = await prisma.creditTransaction.findMany({
      where: {
        userId: user.id,
        type: 'MANUAL_ADJUSTMENT',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        adminUser: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
      },
    });

    const history = transactions.map((txn) => ({
      id: txn.id,
      amount: txn.amount,
      reason: txn.reason,
      createdAt: txn.createdAt,
      balanceAfter: txn.balanceAfter,
      adminName: txn.adminUser?.fullName || txn.adminUser?.username || 'Admin',
    }));

    return NextResponse.json({ history });
  } catch (err: any) {
    console.error('GET /api/credits/history error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
