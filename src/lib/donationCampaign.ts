import { prisma } from '@/lib/prisma';

export type DonationCampaignSnapshot = {
  id: string;
  amountTarget: number | null;
  expiryDate: Date;
  status: 'ACTIVE' | 'CLOSED' | 'EXPIRED';
};

export async function getCampaignCollectedAmount(campaignId: string) {
  const aggregate = await prisma.donation.aggregate({
    where: { campaignId, status: 'APPROVED' },
    _sum: { amount: true },
  });
  return Number(aggregate._sum.amount || 0);
}

export function computeDonationProgress(campaign: Pick<DonationCampaignSnapshot, 'amountTarget' | 'expiryDate' | 'status'>, approvedAmount: number) {
  const target = campaign.amountTarget ?? 0;
  const now = new Date();
  const expiredByTime = campaign.expiryDate <= now;
  const reachedTarget = target > 0 ? approvedAmount >= target : false;
  const remainingAmount = target > 0 ? Math.max(0, target - approvedAmount) : null;

  const shouldBeClosed = campaign.status === 'ACTIVE' && (expiredByTime || reachedTarget);
  const closedStatus = reachedTarget ? 'CLOSED' : expiredByTime ? 'EXPIRED' : campaign.status;

  return {
    target,
    approvedAmount,
    remainingAmount,
    expiredByTime,
    reachedTarget,
    shouldBeClosed,
    closedStatus,
    canAcceptSubmission: campaign.status === 'ACTIVE' && !expiredByTime && !reachedTarget,
  };
}

export async function syncCampaignStatus(campaign: DonationCampaignSnapshot) {
  const approvedAmount = await getCampaignCollectedAmount(campaign.id);
  const progress = computeDonationProgress(campaign, approvedAmount);

  if (progress.shouldBeClosed) {
    await prisma.donationCampaign.update({
      where: { id: campaign.id },
      data: { status: progress.closedStatus },
    });
  }

  return {
    ...progress,
    status: progress.shouldBeClosed ? progress.closedStatus : campaign.status,
  };
}
