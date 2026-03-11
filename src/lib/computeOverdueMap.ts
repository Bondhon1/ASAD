import { prisma } from "@/lib/prisma";
import { getRelevantDonationMonths, DEFAULT_DEADLINE_DAY, isAfterDeadline } from "@/lib/monthlyPayment";

/**
 * Given a list of OFFICIAL (non-exempt) user IDs, returns a map of userId → overdue month count.
 * Performs a single DB query for all users so callers can avoid per-user round-trips.
 */
export async function computeOverdueMap(userIds: string[]): Promise<Record<string, number>> {
  if (userIds.length === 0) return {};

  const overduePairs = getRelevantDonationMonths(24).filter((p) =>
    isAfterDeadline(p.month, p.year, DEFAULT_DEADLINE_DAY)
  );

  if (overduePairs.length === 0) {
    return Object.fromEntries(userIds.map((id) => [id, 0]));
  }

  const payments = await prisma.monthlyPayment.findMany({
    where: {
      userId: { in: userIds },
      status: { in: ["APPROVED", "PENDING"] },
      OR: overduePairs.map((p) => ({ month: p.month, year: p.year })),
    },
    select: { userId: true, month: true, year: true },
  });

  const map: Record<string, number> = {};
  for (const uid of userIds) {
    const userPayments = payments.filter((p) => p.userId === uid);
    map[uid] = overduePairs.filter(
      (dp) => !userPayments.some((p) => p.month === dp.month && p.year === dp.year)
    ).length;
  }
  return map;
}
