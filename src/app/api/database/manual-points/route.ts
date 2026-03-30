import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/prisma-audit';
import { applyPointsChange } from '@/lib/rankUtils';
import { publishBroadcastNotification } from '@/lib/ably';
import { NotificationType } from '@prisma/client';

// ─── Inline rank helpers (used only for the efficient global batch deduction) ──

const RANK_SEQUENCE = [
  'VOLUNTEER', 'Aspiring Volunteer', 'Ready to Serve (RS)', 'Mentor',
  'Dedicated Volunteer *', 'Dedicated Volunteer **',
  'Ability to Lead (AL) *', 'Ability to Lead (AL) **', 'Ability to Lead (AL) ***',
  'Deputy Commander (DC) *', 'Deputy Commander (DC) **',
  'Commander *', 'Commander **', 'Commander ***',
  'Asadian Star (AS) *', 'Asadian Star (AS) **',
  'General Volunteer (GV)', 'Senior Volunteer', 'Senior Commander',
  'Community Builder', 'Strategic Leader', 'Adviser',
];
const PARENT_ONLY_RANKS = ['Dedicated Volunteer', 'Ability to Lead (AL)', 'Deputy Commander (DC)', 'Commander', 'Asadian Star'];

function seqIdx(name: string) {
  return RANK_SEQUENCE.findIndex(r => r.toLowerCase() === name.trim().toLowerCase());
}
function isParentRank(name: string) {
  return PARENT_ONLY_RANKS.some(p => p.toLowerCase() === name.trim().toLowerCase());
}
function findPrevRank(currentName: string, allRanks: { id: string; name: string }[]) {
  const idx = seqIdx(currentName);
  if (idx <= 0) return null;
  for (let i = idx - 1; i >= 0; i--) {
    const rname = RANK_SEQUENCE[i];
    if (isParentRank(rname)) continue;
    const found = allRanks.find(r => r.name.trim().toLowerCase() === rname.toLowerCase());
    if (found) return found;
  }
  return null;
}

// Compute new points + rank for a negative (deduction) change — all in memory, no extra DB calls.
function computeDeductionResult(
  currentPoints: number,
  currentRankId: string | null,
  deduction: number, // positive number
  allRanks: { id: string; name: string }[],
) {
  const newPoints = Math.max(0, currentPoints - deduction);
  const currentRank = currentRankId ? allRanks.find(r => r.id === currentRankId) : null;
  const oldRankName = currentRank?.name ?? null;

  // No rank drop if still above 0 or no rank assigned
  if (newPoints > 0 || !currentRank) {
    return { newPoints, newRankId: currentRank?.id ?? null, rankChanged: false, oldRankName, newRankName: oldRankName };
  }

  // Points hit 0 — attempt downgrade
  const idx = seqIdx(currentRank.name);
  if (idx <= 0 || currentRank.name === 'VOLUNTEER') {
    return { newPoints: 0, newRankId: currentRank.id, rankChanged: false, oldRankName, newRankName: currentRank.name };
  }

  const prevRank = findPrevRank(currentRank.name, allRanks);
  if (!prevRank) {
    const volunteer = allRanks.find(r => r.name === 'VOLUNTEER');
    return { newPoints: 0, newRankId: volunteer?.id ?? null, rankChanged: true, oldRankName, newRankName: 'VOLUNTEER' };
  }
  return { newPoints: 0, newRankId: prevRank.id, rankChanged: true, oldRankName, newRankName: prevRank.name };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!requester) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!['MASTER', 'DATABASE_DEPT'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const taskName = (body.taskName || 'Manual upgrade').toString();
    const points = Number(body.points ?? 0);
    const idsCsv = (body.idsCsv || '').toString();
    const enableNegativeDeduction = Boolean(body.enableNegativeDeduction);
    const negativePoints = Math.abs(Number(body.negativePoints ?? 0));

    // At least one operation must be requested
    const hasPositiveIds = idsCsv.trim().length > 0;
    if (!hasPositiveIds && !enableNegativeDeduction) {
      return NextResponse.json({ error: 'No IDs provided and no negative deduction enabled' }, { status: 400 });
    }

    // ── Part 1: Positive points for specific IDs (existing logic) ────────────
    const rawIds = hasPositiveIds
      ? idsCsv.split(/[,\n\r]+/).map((s: string) => s.trim()).filter(Boolean)
      : [];

    const results: Array<any> = [];
    const succeededUserIds: string[] = [];
    // Track the actual DB user IDs of the provided-ID users (exempt from negative deduction)
    const providedDbUserIds = new Set<string>();

    for (const ident of rawIds) {
      try {
        const user = await prisma.user.findFirst({ where: { OR: [{ volunteerId: ident }, { id: ident }] } });
        if (!user) {
          results.push({ ident, ok: false, error: 'User not found' });
          continue;
        }
        providedDbUserIds.add(user.id);

        // skipHistory=true — shared PointsHistory row created after the loop
        const r = await applyPointsChange(user.id, points, `Manual points: ${taskName}`, undefined, undefined, undefined, true);
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
      // One shared PointsHistory row for the positive batch
      try {
        await prisma.pointsHistory.create({
          data: {
            userId: requester.id,
            targetUserIds: succeededUserIds,
            change: points,
            reason: `Manual points: ${taskName}`,
          },
        });
      } catch (histErr) {
        console.error('Failed to create batch points history', histErr);
      }

      // One broadcast notification for positive additions
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
        try {
          await publishBroadcastNotification(succeededUserIds, {
            id: notif.id, type: notif.type, title: notif.title,
            message: notif.message ?? null, link: notif.link ?? null, createdAt: notif.createdAt,
          });
        } catch (pubErr) {
          console.error('Failed to publish broadcast notification via Ably', pubErr);
        }
      } catch (notifErr) {
        console.error('Failed to create broadcast notification', notifErr);
      }
    }

    // ── Part 2: Global negative deduction ────────────────────────────────────
    let negativeDeductionSummary: {
      negativePoints: number;
      totalAffected: number;
      skippedOnLeave: number;
      skippedInIdList: number;
      rankChangedCount: number;
      failed: number;
    } | null = null;

    if (enableNegativeDeduction && negativePoints > 0) {
      try {
        const today = new Date();

        // Fetch all ranks once (needed for in-memory rank computation)
        const allRanks = await prisma.rank.findMany({ select: { id: true, name: true } });

        // Find users currently on APPROVED leave overlapping today
        const onLeaveRows = await prisma.leave.findMany({
          where: { status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } },
          select: { userId: true },
        });
        const onLeaveUserIds = new Set(onLeaveRows.map(l => l.userId));

        // Fetch all OFFICIAL users with their volunteer profiles
        const officials = await prisma.user.findMany({
          where: { status: 'OFFICIAL' },
          select: {
            id: true,
            volunteerProfile: { select: { points: true, rankId: true } },
          },
        });

        // Categorise each user
        type DeductTarget = {
          userId: string;
          newPoints: number;
          newRankId: string | null;
          rankChanged: boolean;
          oldRankName: string | null;
          newRankName: string | null;
        };

        const targets: DeductTarget[] = [];
        let skippedInIdList = 0;
        let skippedOnLeave = 0;

        for (const official of officials) {
          if (providedDbUserIds.has(official.id)) { skippedInIdList++; continue; }
          if (onLeaveUserIds.has(official.id)) { skippedOnLeave++; continue; }
          if (!official.volunteerProfile) continue; // no profile = skip

          const res = computeDeductionResult(
            official.volunteerProfile.points,
            official.volunteerProfile.rankId,
            negativePoints,
            allRanks,
          );
          targets.push({ userId: official.id, ...res });
        }

        // Batch update profiles in chunks of 100 to stay within Vercel limits
        const CHUNK = 100;
        let failed = 0;
        const deductedUserIds: string[] = [];

        for (let i = 0; i < targets.length; i += CHUNK) {
          const chunk = targets.slice(i, i + CHUNK);
          try {
            await prisma.$transaction(
              chunk.map(t =>
                prisma.volunteerProfile.update({
                  where: { userId: t.userId },
                  data: { points: t.newPoints, rankId: t.newRankId },
                })
              )
            );
            deductedUserIds.push(...chunk.map(t => t.userId));
          } catch (chunkErr) {
            console.error(`Chunk ${i}-${i + CHUNK} failed:`, chunkErr);
            failed += chunk.length;
          }
        }

        // Create rank-change notifications in bulk
        const rankChangers = targets.filter(t => t.rankChanged && deductedUserIds.includes(t.userId));
        if (rankChangers.length > 0) {
          try {
            await prisma.notification.createMany({
              data: rankChangers.map(t => ({
                userId: t.userId,
                broadcast: false,
                type: NotificationType.RANK_UPDATE,
                title: '📉 Rank Changed',
                message: `Your rank has changed from ${t.oldRankName ?? 'Unranked'} to ${t.newRankName}. Keep contributing to level up!`,
                link: '/dashboard',
              })),
              skipDuplicates: true,
            });
          } catch (notifErr) {
            console.error('Failed to create rank-change notifications for deduction', notifErr);
          }
        }

        // One batch PointsHistory row for global deduction
        if (deductedUserIds.length > 0) {
          try {
            await prisma.pointsHistory.create({
              data: {
                userId: requester.id,
                targetUserIds: deductedUserIds,
                change: -negativePoints,
                reason: `Global deduction: ${taskName}`,
              },
            });
          } catch (histErr) {
            console.error('Failed to create negative deduction history', histErr);
          }

          // One broadcast notification for global deduction
          try {
            const notif = await prisma.notification.create({
              data: {
                userId: requester.id,
                broadcast: true,
                targetUserIds: deductedUserIds,
                type: 'SYSTEM_ANNOUNCEMENT',
                title: 'Points Deducted',
                message: `"${taskName}" applied: -${negativePoints} points (global deduction).`,
                link: '/dashboard',
              },
            });
            try {
              await publishBroadcastNotification(deductedUserIds, {
                id: notif.id, type: notif.type, title: notif.title,
                message: notif.message ?? null, link: notif.link ?? null, createdAt: notif.createdAt,
              });
            } catch (pubErr) {
              console.error('Failed to publish negative deduction notification via Ably', pubErr);
            }
          } catch (notifErr) {
            console.error('Failed to create negative deduction broadcast notification', notifErr);
          }
        }

        negativeDeductionSummary = {
          negativePoints,
          totalAffected: deductedUserIds.length,
          skippedOnLeave,
          skippedInIdList,
          rankChangedCount: rankChangers.length,
          failed,
        };
      } catch (negErr: any) {
        console.error('Global negative deduction failed:', negErr);
        negativeDeductionSummary = {
          negativePoints,
          totalAffected: 0,
          skippedOnLeave: 0,
          skippedInIdList: 0,
          rankChangedCount: 0,
          failed: -1, // indicates a fatal error
        };
      }
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    try {
      await createAuditLog(requester.id, 'MANUAL_POINTS_ADJUSTMENT', { taskName, points, ids: rawIds, results, negativeDeductionSummary }, undefined, points);
    } catch (e) {
      console.error('Failed to create audit log', e);
    }

    const successCount = results.filter(r => r.ok).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      ok: true,
      summary: `${successCount} succeeded, ${failCount} failed`,
      results,
      negativeDeductionSummary,
    });
  } catch (err: any) {
    console.error('POST /api/database/manual-points error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
