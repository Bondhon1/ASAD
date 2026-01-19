import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// In-memory cache for payments data
let paymentsCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 15000; // 15 seconds - short TTL for frequently updated data

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check cache first (only for data, still verify authorization)
    const now = Date.now();
    const useCache = paymentsCache && (now - paymentsCache.timestamp < CACHE_TTL);

    // Run authorization check in parallel with data fetch (or cache check)
    const [user, paymentsData] = await Promise.all([
      prisma.user.findUnique({ 
        where: { email: session.user.email },
        select: { role: true }
      }),
      useCache 
        ? Promise.resolve(paymentsCache!.data)
        : fetchPaymentsData(),
    ]);

    // Authorization check
    if (!user || (user.role !== "HR" && user.role !== "MASTER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Enforce server-side filtering as a safeguard: only return payments with status 'PENDING'
    const filtered = {
      initialPayments: (paymentsData.initialPayments || []).filter((p: any) => p.status === "PENDING"),
      finalPayments: (paymentsData.finalPayments || []).filter((p: any) => p.status === "PENDING"),
    };

    // If cache was not used, update the cache with the filtered result for consistency
    if (!useCache) {
      paymentsCache = { data: filtered, timestamp: Date.now() };
    }

    return NextResponse.json(filtered, {
      headers: { 'X-Cache': useCache ? 'HIT' : 'MISS' }
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

async function fetchPaymentsData() {
  const [initialPayments, finalPayments] = await Promise.all([
    prisma.initialPayment.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        userId: true,
        trxId: true,
        reference: true,
        paymentMethod: true,
        senderNumber: true,
        paymentDate: true,
        paymentTime: true,
        status: true,
        createdAt: true,
        proofUrl: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            volunteerId: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.finalPayment.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        userId: true,
        trxId: true,
        paymentMethod: true,
        senderNumber: true,
        paymentDate: true,
        paymentTime: true,
        status: true,
        createdAt: true,
        proofUrl: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            volunteerId: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const data = { initialPayments, finalPayments };
  // Filter to only pending payments before caching/returning
  const filtered = {
    initialPayments: (initialPayments || []).filter((p: any) => p.status === "PENDING"),
    finalPayments: (finalPayments || []).filter((p: any) => p.status === "PENDING"),
  };

  // Update cache with filtered data
  paymentsCache = { data: filtered, timestamp: Date.now() };

  return filtered;
}
