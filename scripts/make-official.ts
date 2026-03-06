#!/usr/bin/env tsx
/**
 * Make users OFFICIAL:
 *  1. User.status          → OFFICIAL
 *  2. VolunteerProfile     → upsert with isOfficial = true
 *  3. Application          → status ACCEPTED, interviewResult PASSED
 *  4. FinalPayment         → create dummy (VERIFIED) if not present
 */
import { prisma } from '../src/lib/prisma';

const TARGET_EMAILS = [
  'abcd@gmail.com',
];

async function main() {
  console.log('======================================================');
  console.log('  MAKE USERS OFFICIAL');
  console.log('======================================================\n');

  for (const email of TARGET_EMAILS) {
    process.stdout.write(`Processing ${email} ... `);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, status: true, finalPayment: { select: { id: true } } },
    });

    if (!user) {
      console.log('NOT FOUND — skipped');
      continue;
    }

    // 1. User.status → OFFICIAL
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'OFFICIAL' },
    });

    // 2. VolunteerProfile upsert
    await prisma.volunteerProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, isOfficial: true },
      update: { isOfficial: true },
    });

    // 3. Application: ACCEPTED + PASSED
    await prisma.application.updateMany({
      where: { userId: user.id },
      data: { status: 'ACCEPTED', interviewResult: 'PASSED' },
    });

    // 4. FinalPayment: create dummy if not present
    let paymentCreated = false;
    if (!user.finalPayment) {
      await prisma.finalPayment.create({
        data: {
          userId: user.id,
          amount: 170,
          trxId: `DUMMY-OFFICIAL-${user.id.slice(-6).toUpperCase()}`,
          paymentMethod: 'bkash',
          senderNumber: '01700000000',
          paymentDate: new Date(),
          paymentTime: '12:00',
          status: 'VERIFIED',
          verifiedAt: new Date(),
        },
      });
      paymentCreated = true;
    }

    console.log(`✓  (payment: ${paymentCreated ? 'created dummy' : 'already exists'})`);
  }

  console.log('\n------------------------------------------------------');

  // Verification pass
  const users = await prisma.user.findMany({
    where: { email: { in: TARGET_EMAILS } },
    select: {
      email: true,
      status: true,
      volunteerProfile: { select: { isOfficial: true } },
      application: { select: { status: true, interviewResult: true } },
      finalPayment: { select: { status: true } },
    },
    orderBy: { email: 'asc' },
  });

  console.log('\nVerification:\n');
  console.log(
    '  ' +
      'Email'.padEnd(38) +
      'Status'.padEnd(12) +
      'Official'.padEnd(10) +
      'App'.padEnd(12) +
      'Payment',
  );
  console.log('  ' + '-'.repeat(85));

  for (const u of users) {
    const status    = u.status ?? '—';
    const official  = u.volunteerProfile?.isOfficial ? 'true' : 'false';
    const appStatus = u.application?.status ?? '—';
    const payment   = u.finalPayment?.status ?? 'MISSING';
    const ok = status === 'OFFICIAL' && official === 'true' && appStatus === 'ACCEPTED' && payment === 'VERIFIED';
    console.log(
      `  ${ok ? '✓' : '✗'} ${u.email.padEnd(36)} ${status.padEnd(12)} ${official.padEnd(10)} ${appStatus.padEnd(12)} ${payment}`,
    );
  }

  console.log(`\nDone. ${users.length}/${TARGET_EMAILS.length} user(s) found and processed.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
