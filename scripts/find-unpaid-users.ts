#!/usr/bin/env tsx
/**
 * Finds users who created an account but never submitted BOTH initial and final payments.
 *
 * EXCLUDES:
 *   - Users with status === OFFICIAL
 *   - Any email listed in EXCEPTION_EMAILS below
 *   - Users who have any InitialPayment (including REJECTED/PENDING/VERIFIED)
 *   - Users who have any FinalPayment (including REJECTED/PENDING/VERIFIED)
 *
 * INCLUDES as "unpaid":
 *   - No InitialPayment record
 *   - AND no FinalPayment record
 *
 * Usage:
 *   npx tsx scripts/find-unpaid-users.ts            ← list + stats only (safe)
 *   npx tsx scripts/find-unpaid-users.ts --delete   ← actually delete the users
 */

import { prisma } from '../src/lib/prisma';
import { del } from '@vercel/blob';
import { writeFileSync } from 'fs';
import { join } from 'path';

// ─── Manual exceptions ────────────────────────────────────────────────────────
// Add emails here to skip them even if they have no/rejected initial payment.
const EXCEPTION_EMAILS: string[] = [
  // 'someone@example.com',
  'sadman90@gmail.com',
  'jahenkhan96@gmail.com',
  'amarsomoyamardesh.it@gmail.com',

];
// ─────────────────────────────────────────────────────────────────────────────

const DRY_RUN = !process.argv.includes('--delete');

const OUTPUT_FILE = join(__dirname, 'unpaid-users.txt');
const BACKUP_FILE = join(
  __dirname,
  `unpaid-users-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
);
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
      AND: [{ initialPayment: null }, { finalPayment: null }],
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      username: true,
      status: true,
      role: true,
      profilePicUrl: true,
      createdAt: true,
      initialPayment: { select: { status: true, createdAt: true } },
      finalPayment: { select: { status: true, createdAt: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return users;
}

function printStats(users: Awaited<ReturnType<typeof findUnpaidUsers>>) {
  const byStatus: Record<string, number> = {};
  const byRole:   Record<string, number> = {};
  const noInitial = users.filter(u => u.initialPayment === null).length;
  const noFinal = users.filter(u => u.finalPayment === null).length;

  for (const u of users) {
    byStatus[u.status] = (byStatus[u.status] ?? 0) + 1;
    byRole[u.role]     = (byRole[u.role]     ?? 0) + 1;
  }

  log('\n══════════════════════════════════════════════════════');
  log('  UNPAID USERS — STATS');
  log('══════════════════════════════════════════════════════');
  log(`  Total unpaid           : ${users.length}`);
  log(`    └─ No InitialPayment : ${noInitial}`);
  log(`    └─ No FinalPayment   : ${noFinal}`);

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
  log('  ID                           | Status                   | Role        | Initial/Final | Email');
  log('  ' + '─'.repeat(110));
  for (const u of users) {
    const paymentInfo = `${u.initialPayment ? 'has-initial' : 'none'}/${u.finalPayment ? 'has-final' : 'none'}`;
    log(
      `  ${u.id.padEnd(28)} | ${u.status.padEnd(24)} | ${u.role.padEnd(11)} | ${paymentInfo.padEnd(13)} | ${u.email}`
    );
  }
  log();
}

function getBlobToken() {
  return (
    process.env.BLOB_READ_WRITE_TOKEN ||
    process.env.VERCEL_BLOB_READ_WRITE_TOKEN ||
    process.env.VERCEL_BLOB_TOKEN ||
    process.env.BLOB_TOKEN ||
    ''
  );
}

function isLikelyVercelBlobUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

async function deleteProfilePics(users: Awaited<ReturnType<typeof findUnpaidUsers>>) {
  const blobToken = getBlobToken();
  const urls = users
    .map((u) => u.profilePicUrl?.trim())
    .filter((url): url is string => Boolean(url && isLikelyVercelBlobUrl(url)));

  if (urls.length === 0) {
    log('  Profile pics to delete      : 0');
    return;
  }

  if (!blobToken) {
    log(`  ⚠ Skipping profile pic delete: missing blob token (found ${urls.length} Vercel Blob URL(s)).`);
    return;
  }

  try {
    await del(urls, { token: blobToken });
    log(`  Deleted profile pic blobs   : ${urls.length}`);
  } catch (error: any) {
    log(`  ⚠ Profile pic blob deletion failed: ${error?.message ?? error}`);
  }
}

async function backupUsersForRestore(ids: string[]) {
  const backup = {
    createdAt: new Date().toISOString(),
    note: 'Backup created before deleting unpaid users. profilePicUrl intentionally excluded.',
    userIds: ids,
    data: {
      users: await prisma.user.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          phone: true,
          password: true,
          instituteId: true,
          joiningSemester: true,
          status: true,
          volunteerId: true,
          designation: true,
          role: true,
          emailVerified: true,
          emailVerificationToken: true,
          emailVerificationExpiry: true,
          emailVerificationResendCount: true,
          emailVerificationLastResent: true,
          division: true,
          district: true,
          upazila: true,
          addressLine: true,
          guardianName: true,
          guardianContact: true,
          birthdate: true,
          googleRefreshToken: true,
          calendarConnectedAt: true,
          calendarEmail: true,
          interviewApprovedById: true,
          monthlyPaymentExempt: true,
          monthlyPaymentExemptReason: true,
          monthlyPaymentExemptAt: true,
          monthlyPaymentExemptById: true,
          credits: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      accounts: await prisma.account.findMany({ where: { userId: { in: ids } } }),
      sessions: await prisma.session.findMany({ where: { userId: { in: ids } } }),
      volunteerProfiles: await prisma.volunteerProfile.findMany({ where: { userId: { in: ids } } }),
      applications: await prisma.application.findMany({ where: { userId: { in: ids } } }),
      committeeMembers: await prisma.committeeMember.findMany({ where: { userId: { in: ids } } }),
      pointsHistory: await prisma.pointsHistory.findMany({ where: { userId: { in: ids } } }),
      experiences: await prisma.experience.findMany({ where: { userId: { in: ids } } }),
      taskSubmissions: await prisma.taskSubmission.findMany({ where: { userId: { in: ids } } }),
      donations: await prisma.donation.findMany({ where: { userId: { in: ids } } }),
      initialPayments: await prisma.initialPayment.findMany({ where: { userId: { in: ids } } }),
      finalPayments: await prisma.finalPayment.findMany({ where: { userId: { in: ids } } }),
      stories: await prisma.story.findMany({ where: { createdById: { in: ids } } }),
      posts: await prisma.post.findMany({ where: { authorId: { in: ids } } }),
      postComments: await prisma.postComment.findMany({ where: { authorId: { in: ids } } }),
      postReactions: await prisma.postReaction.findMany({ where: { userId: { in: ids } } }),
      commentReactions: await prisma.commentReaction.findMany({ where: { userId: { in: ids } } }),
      postSeens: await prisma.postSeen.findMany({ where: { userId: { in: ids } } }),
      postReports: await prisma.postReport.findMany({ where: { reporterId: { in: ids } } }),
      follows: await prisma.follow.findMany({
        where: { OR: [{ followerId: { in: ids } }, { followingId: { in: ids } }] },
      }),
      friendRequests: await prisma.friendRequest.findMany({
        where: { OR: [{ senderId: { in: ids } }, { receiverId: { in: ids } }] },
      }),
      friendLists: await prisma.friendList.findMany({
        where: { OR: [{ userId: { in: ids } }, { friendId: { in: ids } }] },
      }),
      messages: await prisma.message.findMany({
        where: { OR: [{ fromUserId: { in: ids } }, { toUserId: { in: ids } }] },
      }),
      conversations: await prisma.conversation.findMany({
        where: { OR: [{ user1Id: { in: ids } }, { user2Id: { in: ids } }] },
      }),
      leaves: await prisma.leave.findMany({ where: { userId: { in: ids } } }),
      notifications: await prisma.notification.findMany({ where: { userId: { in: ids } } }),
      broadcastReads: await prisma.broadcastRead.findMany({ where: { userId: { in: ids } } }),
      creditWithdrawals: await prisma.creditWithdrawal.findMany({ where: { userId: { in: ids } } }),
      creditTransactions: await prisma.creditTransaction.findMany({ where: { userId: { in: ids } } }),
      orgJoinRequests: await prisma.orgJoinRequest.findMany({ where: { userId: { in: ids } } }),
      monthlyPayments: await prisma.monthlyPayment.findMany({ where: { userId: { in: ids } } }),
      monthlyDelayRequests: await prisma.monthlyPaymentDelayRequest.findMany({ where: { userId: { in: ids } } }),
    },
  };

  writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2), 'utf-8');
  log(`  Backup JSON saved          : ${BACKUP_FILE}`);
}

async function deleteUnpaidUsers(users: Awaited<ReturnType<typeof findUnpaidUsers>>) {
  const ids = users.map(u => u.id);
  if (ids.length === 0) {
    log('  Nothing to delete.\n');
    return;
  }

  log(`\n  ⚠  Deleting ${ids.length} users and their related data...\n`);

  log('  Creating restore backup JSON...');
  await backupUsersForRestore(ids);

  await deleteProfilePics(users);

  const [
    delAccounts,
    delSessions,
    delVolunteerProfiles,
    delApplications,
    delCommitteeMembers,
    delPointsHistory,
    delExperiences,
    delTaskSubmissions,
    delDonations,
    delInitial,
    delFinal,
    delStories,
    delPosts,
    delPostComments,
    delPostReactions,
    delCommentReactions,
    delPostSeens,
    delPostReports,
    delFollows,
    delFriendRequests,
    delFriendLists,
    delMessages,
    delConversations,
    delLeaves,
    delNotifications,
    delBroadcastReads,
    delCreditWithdrawals,
    delCreditTransactions,
    delOrgJoinRequests,
    delMonthlyPayments,
    delMonthlyDelayRequests,
    deleted,
  ] = await prisma.$transaction([
    prisma.account.deleteMany({ where: { userId: { in: ids } } }),
    prisma.session.deleteMany({ where: { userId: { in: ids } } }),
    prisma.volunteerProfile.deleteMany({ where: { userId: { in: ids } } }),
    prisma.application.deleteMany({ where: { userId: { in: ids } } }),
    prisma.committeeMember.deleteMany({ where: { userId: { in: ids } } }),
    prisma.pointsHistory.deleteMany({ where: { userId: { in: ids } } }),
    prisma.experience.deleteMany({ where: { userId: { in: ids } } }),
    prisma.taskSubmission.deleteMany({ where: { userId: { in: ids } } }),
    prisma.donation.deleteMany({ where: { userId: { in: ids } } }),
    prisma.initialPayment.deleteMany({ where: { userId: { in: ids } } }),
    prisma.finalPayment.deleteMany({ where: { userId: { in: ids } } }),
    prisma.story.deleteMany({ where: { createdById: { in: ids } } }),
    prisma.post.deleteMany({ where: { authorId: { in: ids } } }),
    prisma.postComment.deleteMany({ where: { authorId: { in: ids } } }),
    prisma.postReaction.deleteMany({ where: { userId: { in: ids } } }),
    prisma.commentReaction.deleteMany({ where: { userId: { in: ids } } }),
    prisma.postSeen.deleteMany({ where: { userId: { in: ids } } }),
    prisma.postReport.deleteMany({ where: { reporterId: { in: ids } } }),
    prisma.follow.deleteMany({ where: { OR: [{ followerId: { in: ids } }, { followingId: { in: ids } }] } }),
    prisma.friendRequest.deleteMany({ where: { OR: [{ senderId: { in: ids } }, { receiverId: { in: ids } }] } }),
    prisma.friendList.deleteMany({ where: { OR: [{ userId: { in: ids } }, { friendId: { in: ids } }] } }),
    prisma.message.deleteMany({ where: { OR: [{ fromUserId: { in: ids } }, { toUserId: { in: ids } }] } }),
    prisma.conversation.deleteMany({ where: { OR: [{ user1Id: { in: ids } }, { user2Id: { in: ids } }] } }),
    prisma.leave.deleteMany({ where: { userId: { in: ids } } }),
    prisma.notification.deleteMany({ where: { userId: { in: ids } } }),
    prisma.broadcastRead.deleteMany({ where: { userId: { in: ids } } }),
    prisma.creditWithdrawal.deleteMany({ where: { userId: { in: ids } } }),
    prisma.creditTransaction.deleteMany({ where: { userId: { in: ids } } }),
    prisma.orgJoinRequest.deleteMany({ where: { userId: { in: ids } } }),
    prisma.monthlyPayment.deleteMany({ where: { userId: { in: ids } } }),
    prisma.monthlyPaymentDelayRequest.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);

  log(`  Deleted Account records      : ${delAccounts.count}`);
  log(`  Deleted Session records      : ${delSessions.count}`);
  log(`  Deleted VolunteerProfile     : ${delVolunteerProfiles.count}`);
  log(`  Deleted Application records  : ${delApplications.count}`);
  log(`  Deleted CommitteeMember      : ${delCommitteeMembers.count}`);
  log(`  Deleted PointsHistory        : ${delPointsHistory.count}`);
  log(`  Deleted Experience records   : ${delExperiences.count}`);
  log(`  Deleted TaskSubmission       : ${delTaskSubmissions.count}`);
  log(`  Deleted Donation records     : ${delDonations.count}`);
  log(`  Deleted InitialPayment       : ${delInitial.count}`);
  log(`  Deleted FinalPayment         : ${delFinal.count}`);
  log(`  Deleted Story records        : ${delStories.count}`);
  log(`  Deleted Post records         : ${delPosts.count}`);
  log(`  Deleted PostComment          : ${delPostComments.count}`);
  log(`  Deleted PostReaction         : ${delPostReactions.count}`);
  log(`  Deleted CommentReaction      : ${delCommentReactions.count}`);
  log(`  Deleted PostSeen             : ${delPostSeens.count}`);
  log(`  Deleted PostReport           : ${delPostReports.count}`);
  log(`  Deleted Follow relations     : ${delFollows.count}`);
  log(`  Deleted FriendRequest        : ${delFriendRequests.count}`);
  log(`  Deleted FriendList           : ${delFriendLists.count}`);
  log(`  Deleted Message records      : ${delMessages.count}`);
  log(`  Deleted Conversation records : ${delConversations.count}`);
  log(`  Deleted Leave records        : ${delLeaves.count}`);
  log(`  Deleted Notification records : ${delNotifications.count}`);
  log(`  Deleted BroadcastRead        : ${delBroadcastReads.count}`);
  log(`  Deleted CreditWithdrawal     : ${delCreditWithdrawals.count}`);
  log(`  Deleted CreditTransaction    : ${delCreditTransactions.count}`);
  log(`  Deleted OrgJoinRequest       : ${delOrgJoinRequests.count}`);
  log(`  Deleted MonthlyPayment       : ${delMonthlyPayments.count}`);
  log(`  Deleted DelayRequest         : ${delMonthlyDelayRequests.count}`);
  log(`  Deleted User records         : ${deleted.count}`);
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
