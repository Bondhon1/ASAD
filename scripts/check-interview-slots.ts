#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

const EMAILS = [
  'tabassumarthi60@gmail.com',
  'safarilove224@gmail.com',
  'sadmanjaman@gmail.com',
  'britentr12@gmail.com',
  'mishkat.tc@gmail.com',
  'applerafsan19@gmail.com',
  'sornaly810@gmail.com',
  'jahidhasan112008@gmail.com',
  'mahfizurrahman0028@gmail.com',
  'sabihatarannum192@gmail.com',
  'samianur3048@gmail.com',
  'sadiachad05@gmail.com',
  'samiamjawad@gmail.com',
  'abdul37782@gmail.com',
  'farhanjarif481@gmail.com',
  'saarahbwu@gmail.com',
  'amanirahman888@gmail.com',
  'jerin03dipti@gmail.com',
  'mohammadmohib1567@gmail.com',
  'adhikarymoumita146@gmail.com',
  'yusraislam2708@gmail.com',
  'sajedasabihashoshi786@gmail.com',
  'atiyaislamtiya55@gmail.com',
  'falihasharaf1997@gmail.com',
  'mohammad.pranto.261@northsouth.edu',
  'ratul7266@gmail.com',
  'hawabhuiya92@gmail.com',
  'moni87542@gmail.com',
  'kabirbushra05@gmail.com',
  'sameenmar1234@gmail.com',
  'tahsinalam.edu@gmail.com',
  'parvinhai69@gmail.com',
  'labonisamiaakter65@gmail.com',
  'golammomin232@gmail.com',
];

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: EMAILS } },
    select: {
      email: true,
      status: true,
      application: {
        select: {
          status: true,
          interviewDate: true,
          interviewSlotId: true,
          interviewSlot: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              meetLink: true,
              capacity: true,
              filledCount: true,
            },
          },
        },
      },
      initialPayment: {
        select: {
          status: true,
          amount: true,
          paymentMethod: true,
          createdAt: true,
        },
      },
    },
  });

  // Build a lookup map
  const userMap = new Map(users.map((u) => [u.email, u]));

  // Track counts
  let notFound = 0;
  let missingSlot = 0;

  console.log('\n======================================================');
  console.log('  INTERVIEW SLOT / STATUS CHECK');
  console.log('======================================================\n');

  const rows: string[][] = [];

  for (const email of EMAILS) {
    const u = userMap.get(email);

    if (!u) {
      notFound++;
      rows.push([email, 'NOT IN DB', '-', '-', '-', '-']);
      continue;
    }

    const app = u.application;
    const ip = u.initialPayment;

    const userStatus = u.status;
    const appStatus = app?.status ?? 'NO APPLICATION';
    const slotId = app?.interviewSlotId ?? null;
    const slotTime = app?.interviewSlot?.startTime
      ? app.interviewSlot.startTime.toISOString()
      : null;
    const ipStatus = ip?.status ?? 'NO PAYMENT';

    // Flag: should have a slot but doesn't
    const shouldHaveSlot =
      appStatus === 'INTERVIEW_SCHEDULED' || appStatus === 'INTERVIEW_REQUESTED';
    const slotMissing = shouldHaveSlot && !slotId;

    if (slotMissing) missingSlot++;

    const flag = slotMissing ? ' *** SLOT MISSING' : '';

    rows.push([
      email,
      userStatus,
      appStatus + flag,
      slotId ? `${slotId} (${slotTime})` : 'null',
      String(app?.interviewDate ?? 'null'),
      ipStatus,
    ]);
  }

  // Print table
  const headers = ['Email', 'User Status', 'App Status', 'Slot', 'Interview Date', 'InitPayment'];
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length))
  );

  const sep = colWidths.map((w) => '-'.repeat(w + 2)).join('+');
  const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ');

  console.log(headerLine);
  console.log(sep);

  for (const row of rows) {
    console.log(row.map((cell, i) => (cell ?? '').padEnd(colWidths[i])).join(' | '));
  }

  console.log('\n------------------------------------------------------');
  console.log(`Total emails checked : ${EMAILS.length}`);
  console.log(`Not found in DB      : ${notFound}`);
  console.log(`Missing slot (flag)  : ${missingSlot}`);
  console.log('------------------------------------------------------\n');

  // Detailed view for missing-slot users
  if (missingSlot > 0) {
    console.log('=== USERS WITH MISSING INTERVIEW SLOT ===');
    for (const email of EMAILS) {
      const u = userMap.get(email);
      if (!u || !u.application) continue;
      const app = u.application;
      const shouldHaveSlot =
        app.status === 'INTERVIEW_SCHEDULED' || app.status === 'INTERVIEW_REQUESTED';
      if (shouldHaveSlot && !app.interviewSlotId) {
        console.log(`\n  Email       : ${email}`);
        console.log(`  User Status : ${u.status}`);
        console.log(`  App Status  : ${app.status}`);
        console.log(`  Slot ID     : ${app.interviewSlotId ?? 'null'}`);
        console.log(`  Int. Date   : ${app.interviewDate ?? 'null'}`);
        console.log(`  Init Pay    : ${u.initialPayment?.status ?? 'null'}`);
      }
    }
    console.log('');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
