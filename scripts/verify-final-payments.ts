#!/usr/bin/env tsx
/**
 * Verify FinalPayment for a list of users:
 *  - If a FinalPayment record already exists → set status = VERIFIED, verifiedAt = now
 *  - If no FinalPayment record exists        → create a dummy VERIFIED one
 */
import { prisma } from '../src/lib/prisma';

const TARGET_EMAILS = [
  'abcd@gmail.com',
];

async function main() {
  console.log('======================================================');
  console.log('  VERIFY FINAL PAYMENTS');
  console.log('======================================================\n');

  let updated = 0;
  let created = 0;
  let notFound = 0;

  for (const email of TARGET_EMAILS) {
    process.stdout.write(`Processing ${email} ... `);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, finalPayment: { select: { id: true, status: true } } },
    });

    if (!user) {
      console.log('NOT FOUND — skipped');
      notFound++;
      continue;
    }

    if (user.finalPayment) {
      // Update existing record
      await prisma.finalPayment.update({
        where: { userId: user.id },
        data: { status: 'VERIFIED', verifiedAt: new Date() },
      });
      console.log(`✓  (updated existing — was: ${user.finalPayment.status})`);
      updated++;
    } else {
      // Create dummy verified record
      await prisma.finalPayment.create({
        data: {
          userId: user.id,
          amount: 170,
          trxId: `DUMMY-VERIFIED-${user.id.slice(-6).toUpperCase()}`,
          paymentMethod: 'bkash',
          senderNumber: '01700000000',
          paymentDate: new Date(),
          paymentTime: '12:00',
          status: 'VERIFIED',
          verifiedAt: new Date(),
        },
      });
      console.log('✓  (created dummy VERIFIED)');
      created++;
    }
  }

  console.log('\n------------------------------------------------------');
  console.log(`  Updated : ${updated}`);
  console.log(`  Created : ${created}`);
  console.log(`  Skipped : ${notFound} (user not found)`);
  console.log('------------------------------------------------------\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
