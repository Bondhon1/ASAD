#!/usr/bin/env tsx
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../src/lib/prisma';

async function exportEmailsForSlot(slotId: string) {
  const apps = await prisma.application.findMany({
    where: { interviewSlotId: slotId, user: { status: 'INTERVIEW_SCHEDULED' } },
    include: { user: { select: { email: true } } },
  });

  const emails = Array.from(new Set(apps.map((a) => a.user?.email).filter(Boolean) as string[]));

  const filePath = path.join(process.cwd(), `interview_emails_${slotId}.txt`);
  await fs.writeFile(filePath, emails.join('\n'), { encoding: 'utf8' });
  return { slotId, count: emails.length, filePath };
}

async function main() {
  const args = process.argv.slice(2);
  const defaultSlots = ['cmlgsuftk0000l2045csv35e8', 'cmlkqcwf70000jv04gssn9sfg'];
  const slotIds = args.length ? args : defaultSlots;

  for (const slotId of slotIds) {
    try {
      const res = await exportEmailsForSlot(slotId);
      console.log(`Wrote ${res.count} emails to ${res.filePath}`);
    } catch (e) {
      console.error(`Failed for slot ${slotId}:`, e);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
