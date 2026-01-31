/**
 * Rank Utility Functions
 * 
 * Handles rank upgrade/downgrade logic based on the volunteer hierarchy.
 * 
 * ACTUAL UPGRADE SEQUENCE (parent ranks are skipped):
 * 0. VOLUNTEER (lowest rank, reset) - minimum rank on downgrade
 * 1. Aspiring Volunteer (reset)
 * 2. Ready to Serve (RS) (reset)
 * 3. Mentor (reset)
 * 4. Dedicated Volunteer * (reset - entering parent group)
 * 5. Dedicated Volunteer ** (no reset - same parent)
 * 6. Ability to Lead (AL) * (reset - new parent group)
 * 7. Ability to Lead (AL) ** (no reset)
 * 8. Ability to Lead (AL) *** (no reset)
 * 9. Deputy Commander (DC) * (reset - new parent group)
 * 10. Deputy Commander (DC) ** (no reset)
 * 11. Commander * (reset - new parent group)
 * 12. Commander ** (no reset)
 * 13. Commander *** (no reset)
 * 14. Asadian Star (AS) * (reset - new parent group)
 * 15. Asadian Star (AS) ** (no reset)
 * 16. General Volunteer (GV) (reset - exiting parent group)
 * 17. Senior Volunteer (reset)
 * 18. Senior Commander (reset)
 * 19. Community Builder (reset)
 * 20. Strategic Leader (reset)
 * 21. Adviser (SKIP auto upgrade)
 * 
 * RULES:
 * - Parent ranks (Dedicated Volunteer, Ability to Lead, etc.) are NEVER assigned
 * - Points reset when entering a new group/rank (most transitions)
 * - Points do NOT reset within same parent group (star variants)
 * - Downgrade follows same logic but in reverse, threshold is 0
 * - Minimum points is 0, minimum rank is VOLUNTEER
 */

import { prisma } from './prisma';

// Type for rank from DB
type RankFromDB = {
  id: string;
  name: string;
  thresholdPoints: number;
  description: string | null;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  createdAt: Date;
};

// Ordered sequence of ACTUAL ranks (excluding parent-only ranks)
// This is the real progression path
// VOLUNTEER is the lowest rank (index 0) - users cannot go below this
const RANK_SEQUENCE = [
  'VOLUNTEER',
  'Aspiring Volunteer',
  'Ready to Serve (RS)',
  'Mentor',
  'Dedicated Volunteer *',
  'Dedicated Volunteer **',
  'Ability to Lead (AL) *',
  'Ability to Lead (AL) **',
  'Ability to Lead (AL) ***',
  'Deputy Commander (DC) *',
  'Deputy Commander (DC) **',
  'Commander *',
  'Commander **',
  'Commander ***',
  'Asadian Star (AS) *',
  'Asadian Star (AS) **',
  'General Volunteer (GV)',
  'Senior Volunteer',
  'Senior Commander',
  'Community Builder',
  'Strategic Leader',
  'Adviser',
] as const;

// Parent-only ranks that should NEVER be assigned (skipped during upgrade)
const PARENT_ONLY_RANKS = [
  'Dedicated Volunteer',
  'Ability to Lead (AL)',
  'Deputy Commander (DC)',
  'Commander',
  'Asadian Star', 
] as const;

// Ranks where points DO NOT reset on upgrade (within same parent group)
// These are transitions where both ranks share the same parent
const NO_RESET_TRANSITIONS: Record<string, string[]> = {
  'Dedicated Volunteer *': ['Dedicated Volunteer **'],
  'Ability to Lead (AL) *': ['Ability to Lead (AL) **'],
  'Ability to Lead (AL) **': ['Ability to Lead (AL) ***'],
  'Deputy Commander (DC) *': ['Deputy Commander (DC) **'],
  'Commander *': ['Commander **'],
  'Commander **': ['Commander ***'],
  'Asadian Star (AS) *': ['Asadian Star (AS) **'],
};

// Ranks that skip auto upgrade
const SKIP_AUTO_UPGRADE_RANKS = ['Adviser'];

/**
 * Check if a rank is a parent-only rank (should be skipped)
 */
function isParentOnlyRank(rankName: string): boolean {
  return PARENT_ONLY_RANKS.includes(rankName as any);
}

/**
 * Check if a rank should skip auto upgrade
 */
function shouldSkipAutoUpgrade(rankName: string): boolean {
  return SKIP_AUTO_UPGRADE_RANKS.includes(rankName);
}

/**
 * Get the index of a rank in the sequence
 * Uses normalized comparison to handle minor differences
 */
function getRankSequenceIndex(rankName: string): number {
  const normalized = rankName.trim().toLowerCase();
  return RANK_SEQUENCE.findIndex(r => r.toLowerCase() === normalized);
}

/**
 * Find rank in DB by name (normalized comparison)
 */
function findRankByName(rankName: string, ranks: RankFromDB[]): RankFromDB | null {
  const normalized = rankName.trim().toLowerCase();
  return ranks.find(r => r.name.trim().toLowerCase() === normalized) || null;
}

/**
 * Check if upgrading from one rank to another should reset points
 * Returns true if points should reset, false if they should accumulate
 */
function shouldResetPointsOnUpgrade(fromRank: string | null, toRank: string): boolean {
  if (!fromRank) {
    // First rank assignment - reset to start fresh
    return true;
  }
  
  // Check if this is a no-reset transition (within same parent group)
  const noResetTargets = NO_RESET_TRANSITIONS[fromRank];
  if (noResetTargets && noResetTargets.includes(toRank)) {
    return false;
  }
  
  // All other transitions reset points
  return true;
}

/**
 * Check if downgrading from one rank to another should reset points
 */
function shouldResetPointsOnDowngrade(fromRank: string | null, toRank: string): boolean {
  if (!fromRank) {
    return false;
  }
  
  // Check reverse - if upgrading from toRank to fromRank would NOT reset,
  // then downgrading also should NOT reset (same parent group)
  const noResetTargets = NO_RESET_TRANSITIONS[toRank];
  if (noResetTargets && noResetTargets.includes(fromRank)) {
    return false;
  }
  
  // All other downgrades reset points
  return true;
}

/**
 * Get all ranks from DB ordered by threshold
 */
async function getAllRanksOrdered(): Promise<RankFromDB[]> {
  return prisma.rank.findMany({
    orderBy: { thresholdPoints: 'asc' },
    include: { parent: true },
  });
}

/**
 * Find the appropriate rank for given points
 * Skips parent-only ranks and Adviser (for auto upgrade)
 */
function findRankForPoints(points: number, ranks: RankFromDB[]): RankFromDB | null {
  let matchedRank: RankFromDB | null = null;
  
  for (const rank of ranks) {
    // Skip parent-only ranks (they're never assigned)
    if (isParentOnlyRank(rank.name)) {
      continue;
    }
    // Skip Adviser for auto upgrade
    if (shouldSkipAutoUpgrade(rank.name)) {
      continue;
    }
    
    if (points >= rank.thresholdPoints) {
      matchedRank = rank;
    }
  }
  
  return matchedRank;
}

/**
 * Find the next rank in the sequence if user exceeds current rank's threshold
 * Logic: If points > current rank threshold, move to the next rank in sequence
 */
function findNextRankInSequence(
  currentRankName: string | null,
  totalPoints: number,
  ranks: RankFromDB[]
): RankFromDB | null {
  const currentIndex = currentRankName ? getRankSequenceIndex(currentRankName) : -1;
  
  console.log('[findNextRank] Current rank name:', currentRankName);
  console.log('[findNextRank] Current index in RANK_SEQUENCE:', currentIndex);
  console.log('[findNextRank] Total points:', totalPoints);
  
  // Get current rank from DB to check its threshold
  const currentRankFromDB = currentRankName ? findRankByName(currentRankName, ranks) : null;
  
  if (!currentRankFromDB) {
    console.log('[findNextRank] Current rank not found in DB, checking from beginning');
    // No current rank - find the first rank user qualifies for
    for (let i = 0; i < RANK_SEQUENCE.length; i++) {
      const rankName = RANK_SEQUENCE[i];
      if (isParentOnlyRank(rankName) || shouldSkipAutoUpgrade(rankName)) continue;
      const rankFromDB = findRankByName(rankName, ranks);
      if (rankFromDB && totalPoints >= rankFromDB.thresholdPoints) {
        return rankFromDB;
      }
    }
    return null;
  }
  
  console.log('[findNextRank] Current rank threshold:', currentRankFromDB.thresholdPoints);
  
  // Check if points exceed current rank's threshold
  if (totalPoints < currentRankFromDB.thresholdPoints) {
    console.log('[findNextRank] Points do not exceed current rank threshold - no upgrade');
    return null;
  }
  
  console.log('[findNextRank] Points exceed current threshold! Looking for next rank...');
  
  // Find the next rank in sequence (skip parent-only and Adviser)
  for (let i = currentIndex + 1; i < RANK_SEQUENCE.length; i++) {
    const rankName = RANK_SEQUENCE[i];
    
    // Skip parent-only ranks
    if (isParentOnlyRank(rankName)) {
      console.log('[findNextRank] Skipping parent-only rank:', rankName);
      continue;
    }
    // Skip Adviser for auto upgrade
    if (shouldSkipAutoUpgrade(rankName)) {
      console.log('[findNextRank] Skipping auto-upgrade skip rank:', rankName);
      continue;
    }
    
    // Find this rank in DB
    const rankFromDB = findRankByName(rankName, ranks);
    if (!rankFromDB) {
      console.log('[findNextRank] Rank not found in DB:', rankName);
      continue;
    }

    // Only upgrade to this rank if totalPoints meets its threshold
    // Determine whether this transition would reset points (i.e., new parent group)
    const willReset = shouldResetPointsOnUpgrade(currentRankFromDB?.name || null, rankFromDB.name);

    // If the transition does NOT reset points (same parent group), allow upgrade
    // when totalPoints exceeds the CURRENT rank's threshold. Otherwise require
    // meeting the NEXT rank's threshold as before.
    const requiredThreshold = willReset
      ? rankFromDB.thresholdPoints
      : (currentRankFromDB ? currentRankFromDB.thresholdPoints : rankFromDB.thresholdPoints);

    if (totalPoints >= requiredThreshold) {
      console.log('[findNextRank] Found next rank:', rankName, 'requiredThreshold:', requiredThreshold);
      return rankFromDB;
    }

    // If totalPoints doesn't reach the required threshold, no further higher rank
    console.log('[findNextRank] Not enough points for rank:', rankName, 'needed:', requiredThreshold, 'have:', totalPoints);
    return null;
  }
  
  console.log('[findNextRank] No next rank found in sequence');
  return null;
}

/**
 * Find the previous rank in sequence for downgrade
 */
function findPreviousRank(currentRankName: string, ranks: RankFromDB[]): RankFromDB | null {
  const currentIndex = getRankSequenceIndex(currentRankName);
  if (currentIndex <= 0) {
    return null; // Already at first rank
  }
  
  const previousRankName = RANK_SEQUENCE[currentIndex - 1];
  return findRankByName(previousRankName, ranks);
}

/**
 * Calculate new rank and points after adding points
 * 
 * @param userId - The user's ID
 * @param currentPoints - Current points before change
 * @param currentRankId - Current rank ID
 * @param pointsToAdd - Points to add (positive)
 * @returns Object with new rank ID, new points, whether rank changed, and if points were reset
 */
export async function calculateRankUpgrade(
  userId: string,
  currentPoints: number,
  currentRankId: string | null,
  pointsToAdd: number
): Promise<{
  newRankId: string | null;
  newPoints: number;
  rankChanged: boolean;
  pointsReset: boolean;
  oldRankName: string | null;
  newRankName: string | null;
}> {
  const ranks = await getAllRanksOrdered();
  
  let totalPoints = currentPoints + pointsToAdd;
  
  // Fetch current rank by ID from the ranks list
  const currentRank: RankFromDB | null = currentRankId 
    ? ranks.find((r) => r.id === currentRankId) || null 
    : null;
  
  const oldRankName = currentRank?.name || null;
  
  // Debug logging
  console.log('[RankUpgrade] Current rank ID:', currentRankId);
  console.log('[RankUpgrade] Current rank name:', oldRankName);
  console.log('[RankUpgrade] Current points:', currentPoints, '+ Added:', pointsToAdd, '= Total:', totalPoints);
  console.log('[RankUpgrade] Current rank index in sequence:', oldRankName ? getRankSequenceIndex(oldRankName) : -1);
  
  // Find the next rank in sequence that the user qualifies for
  // This ensures we follow RANK_SEQUENCE order, not DB threshold order
  const newRank = findNextRankInSequence(oldRankName, totalPoints, ranks);
  
  console.log('[RankUpgrade] New rank found:', newRank?.name || 'none');
  
  // If no higher rank qualified, stay at current rank with accumulated points
  if (!newRank) {
    console.log('[RankUpgrade] No upgrade - staying at current rank');
    return {
      newRankId: currentRank?.id || null,
      newPoints: totalPoints,
      rankChanged: false,
      pointsReset: false,
      oldRankName,
      newRankName: currentRank?.name || null,
    };
  }

  // Rank changed - check if we need to reset points
  const needsReset = shouldResetPointsOnUpgrade(currentRank?.name || null, newRank.name);
  
  let finalPoints: number;
  if (needsReset) {
    // Reset points to remainder after crossing the previous threshold.
    // If we had a current rank, subtract its threshold (common case).
    // If there was no current rank (first assignment), subtract the new rank threshold.
    if (currentRank) {
      finalPoints = totalPoints - currentRank.thresholdPoints;
    } else {
      finalPoints = totalPoints - newRank.thresholdPoints;
    }
    if (finalPoints < 0) finalPoints = 0;
  } else {
    // No reset: keep the full points (within same parent group)
    finalPoints = totalPoints;
  }
  
  return {
    newRankId: newRank.id,
    newPoints: finalPoints,
    rankChanged: true,
    pointsReset: needsReset,
    oldRankName,
    newRankName: newRank.name,
  };
}

/**
 * Calculate new rank and points after deducting points
 * 
 * SIMPLIFIED DOWNGRADE LOGIC:
 * - Deduct points from current total
 * - If points reach 0, move to the previous rank (skipping parent-only ranks)
 * - Reset points to the previous rank's threshold (so they start at the "top" of that rank)
 * - VOLUNTEER is the minimum rank - cannot go below it
 * 
 * @param userId - The user's ID
 * @param currentPoints - Current points before change
 * @param currentRankId - Current rank ID
 * @param pointsToDeduct - Points to deduct (positive number)
 * @returns Object with new rank ID, new points, whether rank changed, and if points were reset
 */
export async function calculateRankDowngrade(
  userId: string,
  currentPoints: number,
  currentRankId: string | null,
  pointsToDeduct: number
): Promise<{
  newRankId: string | null;
  newPoints: number;
  rankChanged: boolean;
  pointsReset: boolean;
  oldRankName: string | null;
  newRankName: string | null;
}> {
  const ranks = await getAllRanksOrdered();
  
  let newPoints = currentPoints - pointsToDeduct;
  if (newPoints < 0) newPoints = 0;
  
  const currentRank: RankFromDB | null = currentRankId 
    ? ranks.find((r) => r.id === currentRankId) || null 
    : null;
  
  const oldRankName = currentRank?.name || null;
  
  console.log('[RankDowngrade] Current rank:', oldRankName);
  console.log('[RankDowngrade] Current points:', currentPoints, '- Deducting:', pointsToDeduct, '= New points:', newPoints);
  
  // If points are still above 0, no downgrade - just update points
  if (newPoints > 0) {
    console.log('[RankDowngrade] Points still > 0, no rank change');
    return {
      newRankId: currentRank?.id || null,
      newPoints,
      rankChanged: false,
      pointsReset: false,
      oldRankName,
      newRankName: currentRank?.name || null,
    };
  }
  
  // Points reached 0 - need to downgrade
  console.log('[RankDowngrade] Points reached 0 - checking for downgrade');
  
  if (!currentRank) {
    // No current rank - assign VOLUNTEER as minimum
    const volunteerRank = ranks.find(r => r.name === 'VOLUNTEER');
    console.log('[RankDowngrade] No current rank, assigning VOLUNTEER');
    return {
      newRankId: volunteerRank?.id || null,
      newPoints: 0,
      rankChanged: !!volunteerRank,
      pointsReset: true,
      oldRankName: null,
      newRankName: volunteerRank?.name || null,
    };
  }
  
  // Check if already at VOLUNTEER (lowest rank)
  const currentIndex = getRankSequenceIndex(currentRank.name);
  if (currentIndex <= 0 || currentRank.name === 'VOLUNTEER') {
    console.log('[RankDowngrade] Already at VOLUNTEER (lowest rank), staying with 0 points');
    return {
      newRankId: currentRank.id,
      newPoints: 0,
      rankChanged: false,
      pointsReset: false,
      oldRankName,
      newRankName: currentRank.name,
    };
  }
  
  // Find previous rank in sequence (skipping parent-only ranks)
  const previousRank = findPreviousRank(currentRank.name, ranks);
  
  if (!previousRank) {
    // Couldn't find previous rank - try to go to VOLUNTEER
    const volunteerRank = ranks.find(r => r.name === 'VOLUNTEER');
    if (volunteerRank && volunteerRank.id !== currentRank.id) {
      console.log('[RankDowngrade] No previous rank found, falling back to VOLUNTEER');
      return {
        newRankId: volunteerRank.id,
        newPoints: 0,
        rankChanged: true,
        pointsReset: true,
        oldRankName,
        newRankName: 'VOLUNTEER',
      };
    }
    // Stay at current rank with 0 points
    return {
      newRankId: currentRank.id,
      newPoints: 0,
      rankChanged: false,
      pointsReset: false,
      oldRankName,
      newRankName: currentRank.name,
    };
  }
  
  // Simple downgrade: move to previous rank, reset points to that rank's threshold
  // This places them at the "top" of the previous rank
  const resetPoints = previousRank.thresholdPoints;
  
  console.log('[RankDowngrade] Downgrading from', currentRank.name, 'to', previousRank.name);
  console.log('[RankDowngrade] Reset points to:', resetPoints);
  
  return {
    newRankId: previousRank.id,
    newPoints: resetPoints,
    rankChanged: true,
    pointsReset: true,
    oldRankName,
    newRankName: previousRank.name,
  };
}

/**
 * Apply points change and update rank for a user
 * This is the main function to call when adding/deducting points
 */
export async function applyPointsChange(
  userId: string,
  pointsChange: number,
  reason: string,
  relatedTaskId?: string,
  relatedDonationId?: string
): Promise<{
  success: boolean;
  newPoints: number;
  newRankId: string | null;
  newRankName: string | null;
  oldRankName: string | null;
  rankChanged: boolean;
  pointsReset: boolean;
  error?: string;
}> {
  try {
    // Get current volunteer profile
    const profile = await prisma.volunteerProfile.findUnique({
      where: { userId },
      include: { rank: true },
    });
    
    if (!profile) {
      return {
        success: false,
        newPoints: 0,
        newRankId: null,
        newRankName: null,
        oldRankName: null,
        rankChanged: false,
        pointsReset: false,
        error: 'Volunteer profile not found',
      };
    }
    
    const currentPoints = profile.points || 0;
    const currentRankId = profile.rankId;
    
    let result;
    if (pointsChange >= 0) {
      result = await calculateRankUpgrade(userId, currentPoints, currentRankId, pointsChange);
    } else {
      result = await calculateRankDowngrade(userId, currentPoints, currentRankId, Math.abs(pointsChange));
    }
    
    // Update volunteer profile with new points and rank
    await prisma.volunteerProfile.update({
      where: { userId },
      data: {
        points: result.newPoints,
        rankId: result.newRankId,
      },
    });
    
    // Create points history record
    await prisma.pointsHistory.create({
      data: {
        userId,
        change: pointsChange,
        reason,
        relatedTaskId,
        relatedDonationId,
      },
    });
    
    // If rank changed, create a notification
    if (result.rankChanged) {
      const isUpgrade = pointsChange > 0;
      await prisma.notification.create({
        data: {
          userId,
          type: 'RANK_UPDATE',
          title: isUpgrade ? '🎉 Rank Upgraded!' : '📉 Rank Changed',
          message: isUpgrade
            ? `Congratulations! You've been promoted from ${result.oldRankName || 'Unranked'} to ${result.newRankName}!`
            : `Your rank has changed from ${result.oldRankName || 'Unranked'} to ${result.newRankName}. Keep contributing to level up!`,
          link: '/dashboard',
        },
      });
    }
    
    return {
      success: true,
      newPoints: result.newPoints,
      newRankId: result.newRankId,
      newRankName: result.newRankName,
      oldRankName: result.oldRankName,
      rankChanged: result.rankChanged,
      pointsReset: result.pointsReset,
    };
  } catch (error: any) {
    console.error('Error applying points change:', error);
    return {
      success: false,
      newPoints: 0,
      newRankId: null,
      newRankName: null,
      oldRankName: null,
      rankChanged: false,
      pointsReset: false,
      error: error?.message || 'Unknown error',
    };
  }
}
