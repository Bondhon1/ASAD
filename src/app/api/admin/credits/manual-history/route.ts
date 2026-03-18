import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

/** GET /api/admin/credits/manual-history — List all manual credit adjustments */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!['MASTER'].includes(String(requester.role).toUpperCase()))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch all manual credit adjustments from CreditTransaction table
    const transactions = await prisma.creditTransaction.findMany({
      where: { type: 'MANUAL_ADJUSTMENT' },
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
        adminUser: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            volunteerId: true,
            role: true,
          },
        },
      },
    });

    // Group transactions by admin, reason, and time (within 1 minute) to combine batch adjustments
    const groupedAdjustments: Record<string, any> = {};
    
    transactions.forEach((txn) => {
      const key = `${txn.adminUserId}_${txn.reason}_${Math.floor(new Date(txn.createdAt).getTime() / 60000)}`;
      
      if (!groupedAdjustments[key]) {
        groupedAdjustments[key] = {
          id: key,
          actorUserId: txn.adminUserId,
          actorName: txn.adminUser?.fullName || txn.adminUser?.username || 'Unknown',
          actorEmail: txn.adminUser?.email,
          actorVolunteerId: txn.adminUser?.volunteerId,
          actorRole: txn.adminUser?.role,
          createdAt: txn.createdAt,
          reason: txn.reason,
          credits: txn.amount, // Credits per user
          users: [],
        };
      }
      
      groupedAdjustments[key].users.push({
        ident: txn.user.volunteerId || txn.user.id,
        userId: txn.user.id,
        fullName: txn.user.fullName,
        username: txn.user.username,
        ok: true,
        change: txn.amount,
        newCredits: txn.balanceAfter,
      });
    });

    // Format the adjustments
    const formattedAdjustments = Object.values(groupedAdjustments).map((adj: any) => ({
      id: adj.id,
      actorUserId: adj.actorUserId,
      actorName: adj.actorName,
      actorEmail: adj.actorEmail,
      actorVolunteerId: adj.actorVolunteerId,
      actorRole: adj.actorRole,
      createdAt: adj.createdAt,
      reason: adj.reason,
      credits: adj.credits,
      affectedUsers: adj.users.length,
      successCount: adj.users.length,
      failCount: 0,
      totalCreditsAdded: adj.credits * adj.users.length,
      rawMeta: {
        results: adj.users,
      },
    }));

    return NextResponse.json({ adjustments: formattedAdjustments });
  } catch (err: any) {
    console.error('GET /api/admin/credits/manual-history error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
