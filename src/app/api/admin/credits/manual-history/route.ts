import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { prismaAudit } from '@/lib/prisma-audit';

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

    // Fetch all manual credit adjustments from audit log
    const adjustments = await prismaAudit.auditLog.findMany({
      where: { action: 'MANUAL_CREDITS_ADJUSTMENT' },
      orderBy: { createdAt: 'desc' },
    });

    // Parse and format the adjustments
    const formattedAdjustments = adjustments.map((adj) => {
      let parsedMeta = null;
      let reason = '';
      let credits = 0;
      let affectedUsers = 0;
      let successCount = 0;
      let failCount = 0;

      if (adj.meta) {
        try {
          parsedMeta = JSON.parse(adj.meta);
          reason = parsedMeta.reason || 'No reason provided';
          credits = Number(parsedMeta.credits ?? 0);
          if (Array.isArray(parsedMeta.results)) {
            affectedUsers = parsedMeta.results.length;
            successCount = parsedMeta.results.filter((r: any) => r.ok === true).length;
            failCount = parsedMeta.results.filter((r: any) => r.ok === false).length;
          }
        } catch (e) {
          console.error('Failed to parse audit log meta:', e);
        }
      }

      return {
        id: adj.id,
        actorUserId: adj.actorUserId,
        actorName: adj.actorName,
        actorEmail: adj.actorEmail,
        actorVolunteerId: adj.actorVolunteerId,
        actorRole: adj.actorRole,
        createdAt: adj.createdAt,
        reason,
        credits,
        affectedUsers,
        successCount,
        failCount,
        totalCreditsAdded: credits * successCount,
        rawMeta: parsedMeta,
      };
    });

    return NextResponse.json({ adjustments: formattedAdjustments });
  } catch (err: any) {
    console.error('GET /api/admin/credits/manual-history error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
