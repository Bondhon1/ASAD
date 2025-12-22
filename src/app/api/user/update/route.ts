import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = session.user.email;
    const body = await request.json();
    const { fullName, username, institute, profilePicUrl } = body;

    const user = await prisma.user.findUnique({ where: { email }, include: { volunteerProfile: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // incoming profilePicUrl received from client

    // Determine new institute id if institute name provided
    let newInstituteId = user.instituteId;
    if (typeof institute === 'string' && institute.trim()) {
      const inst = await prisma.institute.findFirst({ where: { name: { equals: institute.trim(), mode: 'insensitive' } } });
      if (inst) newInstituteId = inst.id;
      else {
        const created = await prisma.institute.create({ data: { name: institute.trim() } });
        newInstituteId = created.id;
      }
    }

    const ops: any[] = [];

    // If the institute changed and the user is official, sync counters
    const wasOfficial = user.volunteerProfile?.isOfficial;
    const oldInstituteId = user.instituteId;

    if (oldInstituteId && newInstituteId && oldInstituteId !== newInstituteId) {
      // If the volunteer was official, update cached counters.
      // If not official, allow institute change but do not touch counters.
      if (wasOfficial) {
        ops.push(prisma.institute.updateMany({ where: { id: oldInstituteId, totalVolunteersCached: { gt: 0 } }, data: { totalVolunteersCached: { decrement: 1 } } }));
        ops.push(prisma.institute.update({ where: { id: newInstituteId }, data: { totalVolunteersCached: { increment: 1 } } }));
      }
    }

    // update user (return institute relation)
    ops.push(prisma.user.update({ where: { email }, data: {
      fullName: fullName ?? undefined,
      // username should not be editable by client; preserve existing if not provided
      username: username ?? undefined,
      profilePicUrl: profilePicUrl ?? undefined,
      instituteId: newInstituteId ?? undefined,
    }, include: { institute: true, volunteerProfile: true } }));

    const results = await prisma.$transaction(ops);

    const updatedUser = results[results.length - 1];
    // updated profilePicUrl saved in DB (no debug logging)

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
