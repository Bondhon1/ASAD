import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { applyPointsChange } from '@/lib/rankUtils';

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

    for (const ident of rawIds) {
      try {
        // Try volunteerId first, then user id
        const user = await prisma.user.findFirst({ where: { OR: [{ volunteerId: ident }, { id: ident }] } });
        if (!user) {
          results.push({ ident, ok: false, error: 'User not found' });
          continue;
        }

        const r = await applyPointsChange(user.id, points, `Manual points: ${taskName}`);
        if (!r.success) {
          results.push({ ident, ok: false, error: r.error || 'applyPointsChange failed' });
        } else {
          results.push({ ident, ok: true, newPoints: r.newPoints, rankChanged: r.rankChanged, newRankName: r.newRankName });
        }
      } catch (e: any) {
        results.push({ ident, ok: false, error: e?.message || 'Error' });
      }
    }

    // Create an audit log for this action
    try {
      await prisma.auditLog.create({ data: { actorUserId: requester.id, action: 'MANUAL_POINTS_ADJUSTMENT', meta: JSON.stringify({ taskName, points, ids: rawIds, results }) } });
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
