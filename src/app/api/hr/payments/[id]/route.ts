import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hr = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!hr || (hr.role !== "HR" && hr.role !== "MASTER")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { type, action } = body as { type: string; action: string };

    if (!type || !action) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    if (type === "initial") {
      const payment = await prisma.initialPayment.findUnique({ where: { id }, include: { user: true } });
      if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

      if (action === "approve") {
        await prisma.initialPayment.update({ where: { id }, data: { status: "VERIFIED", verifiedAt: new Date() } });
        return NextResponse.json({ success: true });
      }

      if (action === "reject") {
        await prisma.initialPayment.update({ where: { id }, data: { status: "REJECTED" } });
        // set user status to REJECTED so they can re-pay
        await prisma.user.update({ where: { id: payment.userId }, data: { status: "REJECTED" } });
        return NextResponse.json({ success: true });
      }
    }

    if (type === "final") {
      const payment = await prisma.finalPayment.findUnique({ where: { id }, include: { user: true } });
      if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

      if (action === "approve") {
        // support manual assignment: body may contain assignMode: 'auto'|'manual' and volunteerId when manual
        const { assignMode, volunteerId: manualVolunteerId } = body as { assignMode?: string; volunteerId?: string };

        // determine volunteerId to use
        let volunteerIdToUse: string | null = null;
        if (assignMode === 'manual') {
          if (!manualVolunteerId) return NextResponse.json({ error: 'Manual volunteerId required' }, { status: 400 });
          // ensure uniqueness
          const exists = await prisma.user.findFirst({ where: { volunteerId: manualVolunteerId } });
          if (exists) return NextResponse.json({ error: 'Volunteer ID already in use' }, { status: 409 });
          volunteerIdToUse = manualVolunteerId;
        } else {
          // auto-generate sequential volunteerId starting from 22000799
          const usersWithIds = await prisma.user.findMany({ where: { volunteerId: { not: null } }, select: { volunteerId: true } });
          let maxNumeric = 0;
          for (const u of usersWithIds) {
            const v = u.volunteerId || "";
            const n = parseInt(v, 10);
            if (!Number.isNaN(n) && n > maxNumeric) maxNumeric = n;
          }
          const start = 22000799;
          const nextId = maxNumeric >= start ? maxNumeric + 1 : start;
          volunteerIdToUse = String(nextId);
        }

        const ops: any[] = [];
        // mark final payment verified
        ops.push(prisma.finalPayment.update({ where: { id }, data: { status: "VERIFIED", verifiedAt: new Date() } }));

        // update user to OFFICIAL (only increment institute count if user wasn't already OFFICIAL)
        ops.push(prisma.user.update({ where: { id: payment.userId }, data: { status: "OFFICIAL", volunteerId: volunteerIdToUse } }));

        // If user has an institute and wasn't OFFICIAL before, increment the cached count
        if (payment.user?.instituteId && payment.user.status !== "OFFICIAL") {
          ops.push(prisma.institute.update({ where: { id: payment.user.instituteId }, data: { totalVolunteersCached: { increment: 1 } } }));
        }

        await prisma.$transaction(ops);
        return NextResponse.json({ success: true });
      }

      if (action === "reject") {
        await prisma.finalPayment.update({ where: { id }, data: { status: "REJECTED" } });
        await prisma.user.update({ where: { id: payment.userId }, data: { status: "FINAL_PAYMENT_REJECTED" } });
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: "Invalid type/action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing payment action:", error);
    return NextResponse.json({ error: "Failed to process action" }, { status: 500 });
  }
}
