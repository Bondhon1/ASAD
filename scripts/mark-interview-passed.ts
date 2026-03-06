#!/usr/bin/env tsx
/**
 * Mark all interview-scheduled users (from the Feb/Mar 2026 batch) as INTERVIEW_PASSED.
 * 7 emails that were NOT IN DB are excluded.
 */
import { prisma } from '../src/lib/prisma';

const TARGET_EMAILS = [
  "abcd@gmail.com",
];

async function main() {
  console.log('======================================================');
  console.log('  MARK INTERVIEW_PASSED');
  console.log('======================================================\n');

  // Update User.status
  const userResult = await prisma.user.updateMany({
    where: { email: { in: TARGET_EMAILS } },
    data: { status: 'INTERVIEW_PASSED' },
  });
  console.log(`✓ User.status updated      : ${userResult.count} row(s)`);

  // Update Application.status → ACCEPTED and interviewResult → PASSED
  const appResult = await prisma.application.updateMany({
    where: { user: { email: { in: TARGET_EMAILS } } },
    data: { status: 'ACCEPTED', interviewResult: 'PASSED' },
  });
  console.log(`✓ Application.status updated: ${appResult.count} row(s)\n`);

  // Verify
  const users = await prisma.user.findMany({
    where: { email: { in: TARGET_EMAILS } },
    select: {
      email: true,
      status: true,
      application: { select: { status: true } },
    },
    orderBy: { email: 'asc' },
  });

  console.log('Verification:\n');
  for (const u of users) {
    const userOk   = u.status === 'INTERVIEW_PASSED' ? '✓' : '✗';
    const appOk    = u.application?.status === 'ACCEPTED' ? '✓' : '✗';
    console.log(`  ${userOk}${appOk} ${u.email}`);
    if (u.status !== 'INTERVIEW_PASSED')
      console.log(`      User.status        = ${u.status}`);
    if (u.application?.status !== 'ACCEPTED')
      console.log(`      Application.status = ${u.application?.status}`);
  }

  console.log(`\nDone. ${users.length} user(s) verified.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
