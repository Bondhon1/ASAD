import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// APC eligibility constants
export const APC_BASE_CREDITS = 10000;   // Credits needed for first tier
export const APC_BASE_BDT = 2000;        // BDT for first tier
export const APC_STEP_CREDITS = 5000;    // Credits per additional tier
export const APC_STEP_BDT = 1000;        // BDT per additional tier

/**
 * Calculate APC payout eligibility.
 * Returns { eligibleBDT, creditsToDeduct, remaining }.
 * Returns eligibleBDT = 0 if credits are below minimum.
 */
export function calculateAPCPayout(credits: number) {
  if (credits < APC_BASE_CREDITS) {
    return { eligibleBDT: 0, creditsToDeduct: 0, remaining: credits };
  }
  const additionalSteps = Math.floor((credits - APC_BASE_CREDITS) / APC_STEP_CREDITS);
  const eligibleBDT = APC_BASE_BDT + additionalSteps * APC_STEP_BDT;
  const creditsToDeduct = APC_BASE_CREDITS + additionalSteps * APC_STEP_CREDITS;
  const remaining = credits - creditsToDeduct;
  return { eligibleBDT, creditsToDeduct, remaining };
}

/** POST /api/credits/request-payout — User submits a payout request */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { bkashNumber, termsAccepted } = body;

    if (!bkashNumber?.trim()) {
      return NextResponse.json({ error: 'bKash number is required' }, { status: 400 });
    }

    if (!termsAccepted) {
      return NextResponse.json(
        { error: 'You must accept the APC Terms & Policy to proceed' },
        { status: 400 }
      );
    }

    const userCredits = user.credits ?? 0;
    const { eligibleBDT, creditsToDeduct } = calculateAPCPayout(userCredits);

    if (eligibleBDT === 0) {
      return NextResponse.json(
        { error: `Insufficient credits. Minimum ${APC_BASE_CREDITS.toLocaleString()} credits required.` },
        { status: 400 }
      );
    }

    // Prevent duplicate pending payout requests
    const pendingPayout = await prisma.creditWithdrawal.findFirst({
      where: { userId: user.id, status: 'PENDING' },
    });
    if (pendingPayout) {
      return NextResponse.json(
        { error: 'You already have a pending payout request. Please wait for it to be processed.' },
        { status: 400 }
      );
    }

    // Create payout request (credits are NOT deducted yet — only after admin marks as Paid)
    const payout = await prisma.creditWithdrawal.create({
      data: {
        userId: user.id,
        credits: creditsToDeduct,
        bdtAmount: eligibleBDT,
        bkashNumber: bkashNumber.trim(),
        paymentMethod: 'bkash',
        status: 'PENDING',
        termsAccepted: true,
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MASTER'] } },
      select: { id: true },
    });
    for (const admin of admins) {
      try {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: 'New APC Payout Request',
            message: `${user.fullName || user.username} requested payout of ৳${eligibleBDT} (${creditsToDeduct.toLocaleString()} credits)`,
            link: '/dashboard/admin/credit-management',
          },
        });
      } catch (e) {
        console.error('Failed to create admin notification', e);
      }
    }

    return NextResponse.json({
      ok: true,
      payout,
      eligibleBDT,
      creditsToDeduct,
      message: 'Payout request submitted successfully',
    });
  } catch (err: any) {
    console.error('POST /api/credits/request-payout error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

/** GET /api/credits/request-payout — Fetch user's own payout history */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const payouts = await prisma.creditWithdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        processedBy: { select: { fullName: true, username: true } },
      },
    });

    return NextResponse.json({ payouts, credits: user.credits ?? 0 });
  } catch (err: any) {
    console.error('GET /api/credits/request-payout error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
