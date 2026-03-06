import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { applyPointsChange } from '@/lib/rankUtils';
import { publishBroadcastNotification } from '@/lib/ably';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!['MASTER', 'DATABASE_DEPT'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const taskName = (body.taskName || 'Manual upgrade').toString();
    const points = Number(body.points || 0);
    const idsCsv = (body.idsCsv || '').toString();

    if (!idsCsv || idsCsv.trim().length === 0) return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });

    // parse CSV/newlines into identifiers
    const rawIds = idsCsv.split(/[,\n\r]+/).map((s: string) => s.trim()).filter(Boolean);
    const results: Array<any> = [];
    const succeededUserIds: string[] = [];

    for (const ident of rawIds) {
      try {
        // Try volunteerId first, then user id
        const user = await prisma.user.findFirst({ where: { OR: [{ volunteerId: ident }, { id: ident }] } });
        if (!user) {
          results.push({ ident, ok: false, error: 'User not found' });
          continue;
        }

        // skipHistory=true — one shared PointsHistory row is created after the loop
        const r = await applyPointsChange(user.id, points, `Manual points: ${taskName}`, undefined, undefined, true);
        if (!r.success) {
          results.push({ ident, ok: false, error: r.error || 'applyPointsChange failed' });
        } else {
          results.push({ ident, ok: true, newPoints: r.newPoints, rankChanged: r.rankChanged, newRankName: r.newRankName });
          succeededUserIds.push(user.id);
        }
      } catch (e: any) {
        results.push({ ident, ok: false, error: e?.message || 'Error' });
      }
    }

    if (succeededUserIds.length > 0) {
      // One shared PointsHistory row for the entire batch
      try {
        await prisma.pointsHistory.create({
          data: {
            userId: requester.id,           // actor (required FK); targetUserIds has the actual recipients
            targetUserIds: succeededUserIds,
            change: points,
            reason: `Manual points: ${taskName}`,
          },
        });
      } catch (histErr) {
        console.error('Failed to create batch points history', histErr);
      }

      // One broadcast notification targeted only to the affected users
      try {
        const notif = await prisma.notification.create({
          data: {
            userId: requester.id,
            broadcast: true,
            targetUserIds: succeededUserIds,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: points > 0 ? 'Points Added' : 'Points Adjusted',
            message: `"${taskName}" applied: ${points > 0 ? '+' : ''}${points} points.`,
            link: '/dashboard',
          },
        });

        // Real-time push to each affected user's channel
        try {
          await publishBroadcastNotification(succeededUserIds, {
            id: notif.id,
            type: notif.type,
            title: notif.title,
            message: notif.message ?? null,
            link: notif.link ?? null,
            createdAt: notif.createdAt,
          });
        } catch (pubErr) {
          console.error('Failed to publish broadcast notification via Ably', pubErr);
        }
      } catch (notifErr) {
        console.error('Failed to create broadcast notification', notifErr);
      }
    }

    // Audit log
    try {
      await prisma.auditLog.create({ data: { actorUserId: requester.id, action: 'MANUAL_POINTS_ADJUSTMENT', meta: JSON.stringify({ taskName, points, ids: rawIds, results }), points: points } });
    } catch (e) {
      console.error('Failed to create audit log', e);
    }

    const successCount = results.filter(r => r.ok).length;
    const failCount = results.length - successCount;

    return NextResponse.json({ ok: true, summary: `${successCount} succeeded, ${failCount} failed`, results });
  } catch (err: any) {
    console.error('POST /api/database/manual-points error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
