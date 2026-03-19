#!/usr/bin/env tsx
import { prisma } from "../src/lib/prisma";

const RETENTION_MONTHS = 1;

function getCutoffDate(reference: Date = new Date()): Date {
  const cutoff = new Date(reference);
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
  return cutoff;
}

async function main() {
  const now = new Date();
  const cutoff = getCutoffDate(now);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postSeen = (prisma as any).postSeen;

  console.log("======================================================");
  console.log("  CLEANUP POST SEEN RECORDS");
  console.log("======================================================");
  console.log(`Retention: last ${RETENTION_MONTHS} month(s)`);
  console.log(`Cutoff: ${cutoff.toISOString()}\n`);

  const result = await postSeen.deleteMany({
    where: {
      seenAt: { lt: cutoff },
    },
  });

  console.log(`Deleted rows: ${result.count}`);
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
