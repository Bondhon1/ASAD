#!/usr/bin/env tsx
/**
 * Finds users who created an account but never submitted (or had rejected) an initial payment.
 *
 * EXCLUDES:
 *   - Users with status === OFFICIAL
 *   - Any email listed in EXCEPTION_EMAILS below
 *
 * INCLUDES as "unpaid":
 *   - No InitialPayment record at all
 *   - InitialPayment.status === REJECTED
 *   (PENDING counts as "not yet paid" — remove from the where clause if you want to exclude them)
 *
 * Usage:
 *   npx tsx scripts/find-unpaid-users.ts            ← list + stats only (safe)
 *   npx tsx scripts/find-unpaid-users.ts --delete   ← actually delete the users
 */

import { prisma } from '../src/lib/prisma';
import { writeFileSync } from 'fs';
import { join } from 'path';

// ─── Manual exceptions ────────────────────────────────────────────────────────
// Add emails here to skip them even if they have no/rejected initial payment.
const EXCEPTION_EMAILS: string[] = [
  // 'someone@example.com',
];
// ─────────────────────────────────────────────────────────────────────────────

const DRY_RUN = !process.argv.includes('--delete');

const OUTPUT_FILE = join(__dirname, 'unpaid-users.txt');
const lines: string[] = [];

function log(line = '') {
  console.log(line);
  lines.push(line);
}

function flush() {
  writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf-8');
  console.log(`\n  📄 Output saved to: ${OUTPUT_FILE}\n`);
}

async function findUnpaidUsers() {
  const users = await prisma.user.findMany({
    where: {
      status: { not: 'OFFICIAL' },
      email: EXCEPTION_EMAILS.length ? { notIn: EXCEPTION_EMAILS } : undefined,
      OR: [
        { initialPayment: null },
        { initialPayment: { status: 'REJECTED' } },
      ],
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      username: true,
      status: true,
      role: true,
      createdAt: true,
      initialPayment: { select: { status: true, createdAt: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return users;
}

function printStats(users: Awaited<ReturnType<typeof findUnpaidUsers>>) {
  const byStatus: Record<string, number> = {};
  const byRole:   Record<string, number> = {};
  const noPayment = users.filter(u => u.initialPayment === null).length;
  const rejected  = users.filter(u => u.initialPayment?.status === 'REJECTED').length;

  for (const u of users) {
    byStatus[u.status] = (byStatus[u.status] ?? 0) + 1;
    byRole[u.role]     = (byRole[u.role]     ?? 0) + 1;
  }

  log('\n══════════════════════════════════════════════════════');
  log('  UNPAID USERS — STATS');
  log('══════════════════════════════════════════════════════');
  log(`  Total unpaid           : ${users.length}`);
  log(`    └─ No payment record : ${noPayment}`);
  log(`    └─ Payment REJECTED  : ${rejected}`);

  log('\n  By account status:');
  for (const [status, count] of Object.entries(byStatus).sort()) {
    log(`    ${status.padEnd(28)}: ${count}`);
  }

  log('\n  By role:');
  for (const [role, count] of Object.entries(byRole).sort()) {
    log(`    ${role.padEnd(28)}: ${count}`);
  }

  log('──────────────────────────────────────────────────────\n');
}

function printTable(users: Awaited<ReturnType<typeof findUnpaidUsers>>) {
  log('  ID                           | Status                   | Role        | Payment       | Email');
  log('  ' + '─'.repeat(110));
  for (const u of users) {
    const paymentInfo = u.initialPayment
      ? `REJECTED (${u.initialPayment.createdAt.toISOString().slice(0, 10)})`
      : 'none';
    log(
      `  ${u.id.padEnd(28)} | ${u.status.padEnd(24)} | ${u.role.padEnd(11)} | ${paymentInfo.padEnd(13)} | ${u.email}`
    );
  }
  log();
}

async function deleteUnpaidUsers(users: Awaited<ReturnType<typeof findUnpaidUsers>>) {
  const ids = users.map(u => u.id);
  if (ids.length === 0) {
    log('  Nothing to delete.\n');
    return;
  }

  log(`\n  ⚠  Deleting ${ids.length} users and their related data...\n`);

  const [delInitial] = await prisma.$transaction([
    prisma.initialPayment.deleteMany({ where: { userId: { in: ids } } }),
  ]);
  log(`  Deleted InitialPayment records : ${delInitial.count}`);

  const deleted = await prisma.user.deleteMany({ where: { id: { in: ids } } });
  log(`  Deleted User records           : ${deleted.count}`);
  log('\n  ✓ Done.\n');
}

async function main() {
  log('\n══════════════════════════════════════════════════════');
  log('  FIND UNPAID USERS' + (DRY_RUN ? ' (dry run — pass --delete to delete)' : ' ⚠  DELETE MODE'));
  log('══════════════════════════════════════════════════════\n');

  const users = await findUnpaidUsers();

  if (users.length === 0) {
    log('  No unpaid users found. All good!\n');
    flush();
    return;
  }

  printTable(users);
  printStats(users);

  if (!DRY_RUN) {
    await deleteUnpaidUsers(users);
  } else {
    log('  Run with --delete to remove these users.\n');
  }

  flush();
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
