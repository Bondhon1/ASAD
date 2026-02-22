// @ts-nocheck — COIN MANAGEMENT DISABLED file, TypeScript checking suppressed// ═════════════════════════════════════════════════════════
// COIN MANAGEMENT DISABLED — DO NOT DELETE
// Remove the early return in the handler below to re-enable.
// ═════════════════════════════════════════════════════════
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { publishNotification } from '@/lib/ably';

export async function POST(req: Request) {
  // COIN MANAGEMENT DISABLED — remove this line to re-enable
  return NextResponse.json({ error: 'Feature temporarily disabled' }, { status: 503 });
  // eslint-disable-next-line no-unreachable
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!['MASTER', 'ADMIN'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const reason = (body.reason || 'Manual coin adjustment').toString();
    const coins = Number(body.coins || 0);
    const idsCsv = (body.idsCsv || '').toString();

    if (!idsCsv || idsCsv.trim().length === 0) return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });

    // Parse CSV/newlines into identifiers
    const rawIds = idsCsv.split(/[,\n\r]+/).map((s: string) => s.trim()).filter(Boolean);
    const results: Array<any> = [];

    for (const ident of rawIds) {
      try {
        // Try volunteerId first, then user id
        const user = await prisma.user.findFirst({ 
          where: { OR: [{ volunteerId: ident }, { id: ident }] } 
        });
        
        if (!user) {
          results.push({ ident, ok: false, error: 'User not found' });
          continue;
        }

        // Update user coins
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { coins: { increment: coins } },
        });

        results.push({ 
          ident, 
          ok: true, 
          newCoins: updatedUser.coins,
          change: coins 
        });

        // Create notification for the user
        try {
          const notif = await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'SYSTEM_ANNOUNCEMENT',
              title: `${coins > 0 ? 'Coins Added' : 'Coins Adjusted'}`,
              message: `"${reason}": ${coins > 0 ? '+' : ''}${coins} coins. Total: ${updatedUser.coins} coins.`,
              link: '/dashboard',
            },
          });

          // Publish real-time notification
          try {
            await publishNotification(user.id, {
              id: notif.id,
              type: notif.type,
              title: notif.title,
              message: notif.message || null,
              link: notif.link || null,
              createdAt: notif.createdAt,
            });
          } catch (pubErr) {
            console.error('Failed to publish notification for user', user.id, pubErr);
          }
        } catch (notifErr) {
          console.error('Failed to create notification for user', user.id, notifErr);
        }
      } catch (e: any) {
        results.push({ ident, ok: false, error: e?.message || 'Error' });
      }
    }

    // Create audit log
    try {
      await prisma.auditLog.create({ 
        data: { 
          actorUserId: requester.id, 
          action: 'MANUAL_COINS_ADJUSTMENT', 
          meta: JSON.stringify({ reason, coins, ids: rawIds, results }) 
        } 
      });
    } catch (e) {
      console.error('Failed to create audit log', e);
    }

    const successCount = results.filter(r => r.ok).length;
    const failCount = results.length - successCount;

    return NextResponse.json({ 
      ok: true, 
      summary: `${successCount} succeeded, ${failCount} failed`, 
      results 
    });
  } catch (err: any) {
    console.error('POST /api/admin/coins/manual-update error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
