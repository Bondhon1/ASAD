#!/usr/bin/env tsx
/**
 * Assign a list of users to an interview slot and set status to INTERVIEW_SCHEDULED.
 */
import { prisma } from '../src/lib/prisma';

const SLOT_ID = 'cmm821g2h0000l104mp2d3kap';

const TARGET_EMAILS = [
  'abcd@gmail.com'
];

async function main() {
  console.log('======================================================');
  console.log('  ASSIGN INTERVIEW SLOT');
  console.log('======================================================\n');

  // Fetch slot
  const slot = await prisma.interviewSlot.findUniqueOrThrow({
    where: { id: SLOT_ID },
  });
  console.log(`Slot   : ${SLOT_ID}`);
  console.log(`Time   : ${slot.startTime.toISOString()}`);
  console.log(`Filled : ${slot.filledCount} / ${slot.capacity}\n`);

  // Update User.status
  const userResult = await prisma.user.updateMany({
    where: { email: { in: TARGET_EMAILS } },
    data: { status: 'INTERVIEW_SCHEDULED' },
  });
  console.log(`✓ User.status updated       : ${userResult.count} row(s)`);

  // Update Application — set slot, date, and status
  const appResult = await prisma.application.updateMany({
    where: { user: { email: { in: TARGET_EMAILS } } },
    data: {
      status: 'INTERVIEW_SCHEDULED',
      interviewSlotId: SLOT_ID,
      interviewDate: slot.startTime,
    },
  });
  console.log(`✓ Application.status updated: ${appResult.count} row(s)`);

  // Increment filledCount by actual number of applications updated
  await prisma.interviewSlot.update({
    where: { id: SLOT_ID },
    data: { filledCount: { increment: appResult.count } },
  });
  console.log(`✓ Slot filledCount           : ${slot.filledCount} → ${slot.filledCount + appResult.count}\n`);

  // Verify — show any users not found
  const found = await prisma.user.findMany({
    where: { email: { in: TARGET_EMAILS } },
    select: { email: true, status: true },
  });
  const foundEmails = new Set(found.map((u) => u.email));
  const notFound = TARGET_EMAILS.filter((e) => !foundEmails.has(e));

  console.log('Verification:\n');
  for (const u of found) {
    const ok = u.status === 'INTERVIEW_SCHEDULED' ? '✓' : '✗';
    console.log(`  ${ok} ${u.email} → ${u.status}`);
  }
  if (notFound.length > 0) {
    console.log('\nNot found in DB:');
    for (const e of notFound) console.log(`  - ${e}`);
  }

  console.log(`\nDone. ${found.length} found, ${notFound.length} not in DB.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
