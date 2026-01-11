import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== "HR" && user.role !== "MASTER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const initialPayments = await prisma.initialPayment.findMany({
      include: { user: { select: { id: true, fullName: true, email: true, phone: true, volunteerId: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });

    const finalPayments = await prisma.finalPayment.findMany({
      include: { user: { select: { id: true, fullName: true, email: true, phone: true, volunteerId: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ initialPayments, finalPayments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
