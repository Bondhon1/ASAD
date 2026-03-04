#!/usr/bin/env tsx
/**
 * Fix users whose Application status is INTERVIEW_SCHEDULED
 * but User.status is still APPLICANT (out of sync).
 */
import { prisma } from '../src/lib/prisma';

const TARGET_EMAILS = [
  'jahidhasan112008@gmail.com',
  'sabihatarannum192@gmail.com',
  'saarahbwu@gmail.com',
  'mohammadmohib1567@gmail.com',
  'kabirbushra05@gmail.com',
  'tahsinalam.edu@gmail.com',
];

async function main() {
  console.log('Checking users before fix...\n');

  const before = await prisma.user.findMany({
    where: { email: { in: TARGET_EMAILS } },
    select: {
      email: true,
      status: true,
      application: { select: { status: true } },
    },
  });

  for (const u of before) {
    console.log(`  ${u.email}`);
    console.log(`    User.status        : ${u.status}`);
    console.log(`    Application.status : ${u.application?.status ?? 'none'}`);
  }

  console.log('\nApplying fix...\n');

  const result = await prisma.user.updateMany({
    where: {
      email: { in: TARGET_EMAILS },
      status: 'APPLICANT',
      application: { status: 'INTERVIEW_SCHEDULED' },
    },
    data: { status: 'INTERVIEW_SCHEDULED' },
  });

  console.log(`Updated ${result.count} user(s).\n`);

  const after = await prisma.user.findMany({
    where: { email: { in: TARGET_EMAILS } },
    select: {
      email: true,
      status: true,
      application: { select: { status: true } },
    },
  });

  console.log('Status after fix:\n');
  for (const u of after) {
    const ok = u.status === u.application?.status ? '✓' : '✗';
    console.log(`  ${ok} ${u.email} → User.status = ${u.status}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
