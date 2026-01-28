/**
 * Rank Utility Functions
 * 
 * Handles rank upgrade/downgrade logic based on the volunteer hierarchy.
 * 
 * Hierarchy (from rank.txt):
 * - Aspiring Volunteer
 * - Ready to Serve (RS)
 * - Mentor
 * - Dedicated Volunteer (parent of * variants)
 *   - Dedicated Volunteer *
 *   - Dedicated Volunteer **
 * - Ability to Lead (AL) (parent of * variants)
 *   - Ability to Lead (AL) *
 *   - Ability to Lead (AL) **
 *   - Ability to Lead (AL) ***
 * - Deputy Commander (DC) (parent of * variants)
 *   - Deputy Commander (DC) *
 *   - Deputy Commander (DC) **
 * - Commander (parent of * variants)
 *   - Commander *
 *   - Commander **
 *   - Commander ***
 * - Asadian Star (parent of * variants)
 *   - Asadian Star (AS) *
 *   - Asadian Star (AS) **
 * - General Volunteer (GV)
 * - Senior Volunteer
 * - Senior Commander
 * - Community Builder
 * - Strategic Leader
 * - Adviser (special - skip auto rank upgrade)
 * 
 * Rules:
 * - Actual rank threshold changes don't reset points
 * - Parent rank threshold changes reset points to 0
 * - Downgrade threshold is 0 (when points reach 0, downgrade)
 * - Adviser rank skips auto upgrade
 */

import { prisma } from './prisma';

// Ordered hierarchy of ranks (index = level)
// Ranks with parent are grouped - the parent name appears first, then children in order
export const RANK_HIERARCHY = [
  'Aspiring Volunteer',
  'Ready to Serve (RS)',
  'Mentor',
  // Dedicated Volunteer group
  'Dedicated Volunteer',
  'Dedicated Volunteer *',
  'Dedicated Volunteer **',
  // Ability to Lead group
  'Ability to Lead (AL)',
  'Ability to Lead (AL) *',
  'Ability to Lead (AL) **',
  'Ability to Lead (AL) ***',
  // Deputy Commander group
  'Deputy Commander (DC)',
  'Deputy Commander (DC) *',
  'Deputy Commander (DC) **',
  // Commander group
  'Commander',
  'Commander *',
  'Commander **',
  'Commander ***',
  // Asadian Star group
  'Asadian Star',
  'Asadian Star (AS) *',
  'Asadian Star (AS) **',
  // Post-star ranks
  'General Volunteer (GV)',
  'Senior Volunteer',
  'Senior Commander',
  'Community Builder',
  'Strategic Leader',
  'Adviser',
] as const;

// Parent ranks that reset points when crossed
export const PARENT_RANKS = [
  'Dedicated Volunteer',
  'Ability to Lead (AL)',
  'Deputy Commander (DC)',
  'Commander',
  'Asadian Star',
] as const;

// Ranks that skip auto upgrade
export const SKIP_AUTO_UPGRADE_RANKS = ['Adviser'] as const;

export type RankName = typeof RANK_HIERARCHY[number];

/**
 * Check if a rank is a parent rank (points reset when crossing)
 */
export function isParentRank(rankName: string): boolean {
  return PARENT_RANKS.includes(rankName as any);
}

/**
 * Check if a rank should skip auto upgrade
 */
export function shouldSkipAutoUpgrade(rankName: string): boolean {
  return SKIP_AUTO_UPGRADE_RANKS.includes(rankName as any);
}

/**
 * Get the index of a rank in the hierarchy
 */
export function getRankIndex(rankName: string): number {
  return RANK_HIERARCHY.indexOf(rankName as RankName);
}

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

/**
 * Get all ranks from DB ordered by threshold
 */
export async function getAllRanksOrdered(): Promise<RankFromDB[]> {
  return prisma.rank.findMany({
    orderBy: { thresholdPoints: 'asc' },
    include: { parent: true },
  });
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
  
  let newPoints = currentPoints + pointsToAdd;
  let currentRank: RankFromDB | null | undefined = currentRankId ? ranks.find((r: RankFromDB) => r.id === currentRankId) : null;
  
  // If no current rank, assign the first rank
  if (!currentRank && ranks.length > 0) {
    currentRank = ranks[0];
  }
  
  const oldRankName = currentRank?.name || null;
  let newRank = currentRank;
  let pointsReset = false;
  
  // Check if we should upgrade to a higher rank
  for (let i = ranks.length - 1; i >= 0; i--) {
    const rank = ranks[i];
    
    // Skip if this is the Adviser rank (auto upgrade disabled)
    if (shouldSkipAutoUpgrade(rank.name)) {
      continue;
    }
    
    // Check if points exceed this rank's threshold
    if (newPoints >= rank.thresholdPoints) {
      // Only upgrade if this rank is higher than current
      const currentIndex = currentRank ? getRankIndex(currentRank.name) : -1;
      const newIndex = getRankIndex(rank.name);
      
      if (newIndex > currentIndex) {
        // Check if we're crossing a parent rank boundary
        const crossedParentRank = checkParentRankCrossing(currentRank?.name || '', rank.name);
        
        if (crossedParentRank) {
          // Reset points to 0 when crossing parent rank boundary
          newPoints = newPoints - rank.thresholdPoints; // Keep excess points
          if (newPoints < 0) newPoints = 0;
          pointsReset = true;
        }
        
        newRank = rank;
        break;
      }
    }
  }
  
  return {
    newRankId: newRank?.id || null,
    newPoints,
    rankChanged: newRank?.id !== currentRankId,
    pointsReset,
    oldRankName,
    newRankName: newRank?.name || null,
  };
}

/**
 * Calculate new rank and points after deducting points
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
  
  let currentRank: RankFromDB | null | undefined = currentRankId ? ranks.find((r: RankFromDB) => r.id === currentRankId) : null;
  const oldRankName = currentRank?.name || null;
  let newRank = currentRank;
  let pointsReset = false;
  
  // If points reach 0, we need to check for downgrade
  if (newPoints === 0 && currentRank) {
    const currentIndex = getRankIndex(currentRank.name);
    
    // Find the previous rank in hierarchy
    if (currentIndex > 0) {
      // Check if current rank is a parent rank or within a parent group
      const parentRankCrossed = findPreviousParentRankBoundary(currentRank.name);
      
      if (parentRankCrossed) {
        // When downgrading across parent boundary, find the last rank before the parent
        for (let i = ranks.length - 1; i >= 0; i--) {
          const rank = ranks[i];
          const rankIndex = getRankIndex(rank.name);
          if (rankIndex < getRankIndex(parentRankCrossed)) {
            newRank = rank;
            // Reset points to max threshold of the previous rank
            newPoints = Math.max(0, rank.thresholdPoints - 1);
            pointsReset = true;
            break;
          }
        }
      } else {
        // Simple downgrade within same parent group
        const prevRankName = RANK_HIERARCHY[currentIndex - 1];
        const prevRank = ranks.find((r: RankFromDB) => r.name === prevRankName);
        if (prevRank) {
          newRank = prevRank;
          // Set points to threshold - 1 to be at the max of previous rank
          newPoints = Math.max(0, prevRank.thresholdPoints);
        }
      }
    }
  }
  
  return {
    newRankId: newRank?.id || null,
    newPoints,
    rankChanged: newRank?.id !== currentRankId,
    pointsReset,
    oldRankName,
    newRankName: newRank?.name || null,
  };
}

/**
 * Check if upgrading from one rank to another crosses a parent rank boundary
 */
function checkParentRankCrossing(fromRank: string, toRank: string): string | null {
  const fromIndex = getRankIndex(fromRank);
  const toIndex = getRankIndex(toRank);
  
  // Check each parent rank to see if we cross it
  for (const parentRank of PARENT_RANKS) {
    const parentIndex = getRankIndex(parentRank);
    if (fromIndex < parentIndex && toIndex >= parentIndex) {
      return parentRank;
    }
  }
  
  return null;
}

/**
 * Find if the current rank is at or after a parent rank boundary
 * Returns the parent rank name if found
 */
function findPreviousParentRankBoundary(currentRank: string): string | null {
  const currentIndex = getRankIndex(currentRank);
  
  // Find the parent rank that this rank belongs to (or is itself)
  for (let i = PARENT_RANKS.length - 1; i >= 0; i--) {
    const parentRank = PARENT_RANKS[i];
    const parentIndex = getRankIndex(parentRank);
    
    if (currentIndex >= parentIndex) {
      // Check if current rank is the parent itself or its first variant
      if (currentRank === parentRank || currentRank === `${parentRank} *` || 
          currentRank.startsWith(parentRank.replace(' (', '').replace(')', ''))) {
        return parentRank;
      }
    }
  }
  
  return null;
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
