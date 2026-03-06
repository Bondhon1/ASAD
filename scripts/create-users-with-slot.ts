#!/usr/bin/env tsx
/**
 * Create user accounts for emails not yet in DB, set dummy password,
 * create a VERIFIED InitialPayment, create an Application in INTERVIEW_SCHEDULED,
 * and assign them to the specified interview slot.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

const SLOT_ID   = 'cmm821g2h0000l104mp2d3kap';
const DUMMY_PWD = 'Asad@2026';     // users should be told to reset this

const NOT_IN_DB_EMAILS = [
  'abcd@gmail.com'
];

async function main() {
  console.log('======================================================');
  console.log('  CREATE USERS + INITIAL PAYMENT + INTERVIEW SLOT');
  console.log('======================================================\n');

  const slot = await prisma.interviewSlot.findUniqueOrThrow({ where: { id: SLOT_ID } });
  console.log(`Slot   : ${SLOT_ID}`);
  console.log(`Time   : ${slot.startTime.toISOString()}`);
  console.log(`Filled : ${slot.filledCount} / ${slot.capacity}\n`);

  const hashedPwd = await bcrypt.hash(DUMMY_PWD, 10);
  const today     = new Date();

  let created   = 0;
  let skipped   = 0;
  const results: { email: string; action: string }[] = [];

  for (const email of NOT_IN_DB_EMAILS) {
    // Skip if already exists (idempotent)
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      skipped++;
      results.push({ email, action: 'SKIPPED (already exists)' });
      continue;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPwd,
          emailVerified: true,
          status: 'INTERVIEW_SCHEDULED',
        },
      });

      // 2. Create InitialPayment (VERIFIED, dummy values)
      await tx.initialPayment.create({
        data: {
          userId:        user.id,
          trxId:         `MANUAL-${user.id.slice(-8).toUpperCase()}`,
          paymentMethod: 'manual',
          senderNumber:  '01000000000',
          paymentDate:   today,
          status:        'VERIFIED',
          verifiedAt:    today,
        },
      });

      // 3. Create Application
      await tx.application.create({
        data: {
          userId:          user.id,
          trxId:           `MANUAL-${user.id.slice(-8).toUpperCase()}`,
          paymentMethod:   'manual',
          status:          'INTERVIEW_SCHEDULED',
          interviewSlotId: SLOT_ID,
          interviewDate:   slot.startTime,
        },
      });
    });

    created++;
    results.push({ email, action: 'CREATED' });
  }

  // Increment slot filledCount
  if (created > 0) {
    await prisma.interviewSlot.update({
      where: { id: SLOT_ID },
      data: { filledCount: { increment: created } },
    });
    console.log(`✓ Slot filledCount: ${slot.filledCount} → ${slot.filledCount + created}\n`);
  }

  // Report
  console.log('Results:\n');
  for (const r of results) {
    const icon = r.action === 'CREATED' ? '✓' : '↩';
    console.log(`  ${icon} ${r.email} — ${r.action}`);
  }

  console.log(`\nCreated: ${created}  |  Skipped: ${skipped}`);
  console.log(`Dummy password: ${DUMMY_PWD}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
