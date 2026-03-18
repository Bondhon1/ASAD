/**
 * Reset all user credits to 0
 * This script resets all user credit balances to 0 in preparation for the new credit transaction system.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Resetting all user credits to 0...\n');

  try {
    // Get count of users with non-zero credits
    const usersWithCredits = await prisma.user.count({
      where: {
        credits: {
          not: 0
        }
      }
    });

    console.log(`📊 Found ${usersWithCredits} users with non-zero credits\n`);

    if (usersWithCredits === 0) {
      console.log('✅ All users already have 0 credits. Nothing to do.');
      return;
    }

    // Confirm before proceeding
    console.log('⚠️  WARNING: This will reset ALL user credits to 0!');
    console.log('   This action cannot be undone.');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Reset all credits to 0
    const result = await prisma.user.updateMany({
      data: {
        credits: 0
      }
    });

    console.log(`✅ Successfully reset credits for ${result.count} users to 0\n`);
    console.log('✨ Credit reset complete!');

  } catch (error) {
    console.error('❌ Error resetting credits:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
