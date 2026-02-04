import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (query.length < 2) {
      return NextResponse.json({ references: [] });
    }

    // Search CA references
    const caReferences = await prisma.cAReference.findMany({
      where: {
        OR: [
          { caCode: { contains: query, mode: "insensitive" } },
          { groupName: { contains: query, mode: "insensitive" } },
          { teamLeader: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        groupName: true,
        caCode: true,
        teamLeader: true,
      },
      take: 10,
      orderBy: { caCode: "asc" },
    });

    // Search volunteers by ID or name (ID range: 22000000-22000800)
    const volunteers = await prisma.user.findMany({
      where: {
        AND: [
          
          { status: "OFFICIAL" },
          // Volunteer ID must be in range 22000000-22000800
          { 
            volunteerId: { 
              gte: "22000000",
              lte: "22000800"
            }
          },
          {
            OR: [
              { volunteerId: { contains: query, mode: "insensitive" } },
              { fullName: { contains: query, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        volunteerId: true,
        fullName: true,
        email: true,
      },
      take: 10,
      orderBy: { volunteerId: "asc" },
    });

    // Combine and format results
    const references = [
      ...caReferences.map((ca) => ({
        id: ca.id,
        type: "CA" as const,
        code: ca.caCode,
        name: ca.groupName,
        leader: ca.teamLeader,
      })),
      ...volunteers.map((vol) => ({
        id: vol.id,
        type: "VOLUNTEER" as const,
        code: vol.volunteerId || "",
        name: vol.fullName || "",
        email: vol.email,
      })),
    ];

    return NextResponse.json({ references });
  } catch (error: any) {
    console.error("Error searching CA references:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search CA references" },
      { status: 500 }
    );
  }
}
