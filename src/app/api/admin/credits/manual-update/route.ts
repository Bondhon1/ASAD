import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { publishNotification } from '@/lib/ably';

/** POST /api/admin/credits/manual-update — Assign or adjust credits for multiple volunteers */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!['MASTER', 'ADMIN'].includes(requester.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const reason = (body.reason || 'Manual credit adjustment').toString();
    const credits = Number(body.credits ?? body.coins ?? 0);
    const idsCsv = (body.idsCsv || '').toString();

    if (!idsCsv.trim())
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });

    const rawIds = idsCsv
      .split(/[,\n\r]+/)
      .map((s: string) => s.trim())
      .filter(Boolean);
    const results: Array<Record<string, unknown>> = [];

    for (const ident of rawIds) {
      try {
        const user = await prisma.user.findFirst({
          where: { OR: [{ volunteerId: ident }, { id: ident }] },
        });

        if (!user) {
          results.push({ ident, ok: false, error: 'User not found' });
          continue;
        }

        // Prevent negative balance
        const newCredits = (user.credits ?? 0) + credits;
        if (newCredits < 0) {
          results.push({ ident, ok: false, error: 'Would result in negative credits balance' });
          continue;
        }

        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { credits: { increment: credits } },
        });

        results.push({
          ident,
          ok: true,
          newCredits: updatedUser.credits,
          change: credits,
        });

        // Notify user
        try {
          const notif = await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'SYSTEM_ANNOUNCEMENT',
              title: credits > 0 ? 'Credits Added' : 'Credits Adjusted',
              message: `"${reason}": ${credits > 0 ? '+' : ''}${credits} credits. Total: ${updatedUser.credits?.toLocaleString()} credits.`,
              link: '/dashboard',
            },
          });

          await publishNotification(user.id, {
            id: notif.id,
            type: notif.type,
            title: notif.title,
            message: notif.message ?? null,
            link: notif.link ?? null,
            createdAt: notif.createdAt,
          });
        } catch (notifErr) {
          console.error('Notification error for user', user.id, notifErr);
        }
      } catch (e: any) {
        results.push({ ident, ok: false, error: e?.message || 'Error' });
      }
    }

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          actorUserId: requester.id,
          action: 'MANUAL_CREDITS_ADJUSTMENT',
          meta: JSON.stringify({ reason, credits, ids: rawIds, results }),
        },
      });
    } catch (_e) { /* non-critical */ }

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error('POST /api/admin/credits/manual-update error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
