#!/usr/bin/env tsx
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../src/lib/prisma';

// Users with status INTERVIEW_SCHEDULED whose interview date is on/after Feb 10 2026
const SINCE = new Date('2026-02-10T00:00:00.000Z');

async function main() {
  const apps = await prisma.application.findMany({
    where: {
      interviewDate: { gte: SINCE },
      user: { status: 'INTERVIEW_SCHEDULED' },
    },
    include: { user: { select: { email: true } } },
  });

  const emails = Array.from(
    new Set(apps.map((a) => a.user?.email).filter(Boolean) as string[])
  );

  const filePath = path.join(process.cwd(), 'interview_scheduled_emails.txt');
  await fs.writeFile(filePath, emails.join('\n'), { encoding: 'utf8' });

  console.log(`Found ${emails.length} email(s). Written to ${filePath}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
