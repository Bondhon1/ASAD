import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logError, getRequestMetadata } from "@/lib/errorLogger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = session.user.email;
    const body = await request.json();
    const { fullName, username, institute, profilePicUrl, address, experiences, guardianName, guardianContact, birthdate, phone, serviceId } = body;

    const user = await prisma.user.findUnique({ where: { email }, include: { volunteerProfile: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Reject base64 data URLs — storing them in PostgreSQL causes massive NeonDB
    // network transfer because every query selecting profilePicUrl transfers the
    // entire encoded image. Profile pictures must be uploaded to Vercel Blob first.
    if (typeof profilePicUrl === 'string' && profilePicUrl.startsWith('data:')) {
      return NextResponse.json(
        { error: 'Profile picture must be a hosted URL. Please upload the image first.' },
        { status: 400 }
      );
    }
    // Also validate it looks like a URL if provided
    if (typeof profilePicUrl === 'string' && profilePicUrl.length > 0) {
      try {
        const u = new URL(profilePicUrl);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad protocol');
      } catch {
        return NextResponse.json({ error: 'profilePicUrl must be a valid https URL' }, { status: 400 });
      }
    }

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

    // Prepare sanitized experiences
    const cleanedExperiences = Array.isArray(experiences)
      ? experiences
          .map((exp: any) => ({
            id: typeof exp?.id === 'string' ? exp.id : undefined,
            title: typeof exp?.title === 'string' ? exp.title.trim() : '',
            organization: typeof exp?.organization === 'string' ? exp.organization.trim() : null,
            startDate: exp?.startDate ? new Date(exp.startDate) : null,
            endDate: exp?.isCurrent ? null : exp?.endDate ? new Date(exp.endDate) : null,
            isCurrent: !!exp?.isCurrent,
          }))
          .filter((exp: any) => !!exp.title)
      : null;

    if (cleanedExperiences) {
      const keepIds = cleanedExperiences.filter((e: any) => e.id).map((e: any) => e.id);
      ops.push(prisma.experience.deleteMany({
        where: {
          userId: user.id,
          ...(keepIds.length ? { id: { notIn: keepIds } } : {}),
        },
      }));

      cleanedExperiences.forEach((exp: any) => {
        const data = {
          title: exp.title,
          organization: exp.organization,
          startDate: exp.startDate,
          endDate: exp.endDate,
          isCurrent: exp.isCurrent,
        } as any;

        if (exp.id) {
          ops.push(prisma.experience.updateMany({ where: { id: exp.id, userId: user.id }, data }));
        } else {
          ops.push(prisma.experience.create({ data: { ...data, userId: user.id } }));
        }
      });
    }

    // Update serviceId in volunteerProfile if provided (before user update)
    if (serviceId && user.volunteerProfile) {
      ops.push(prisma.volunteerProfile.update({
        where: { userId: user.id },
        data: { serviceId },
      }));
    }

    // update user (return institute relation) - must be last to capture result
    ops.push(prisma.user.update({ where: { email }, data: {
      fullName: fullName ?? undefined,
      // username should not be editable by client; preserve existing if not provided
      username: username ?? undefined,
      profilePicUrl: profilePicUrl ?? undefined,
      instituteId: newInstituteId ?? undefined,
      division: address?.division ?? undefined,
      district: address?.district ?? undefined,
      upazila: address?.upazila ?? undefined,
      addressLine: address?.addressLine ?? undefined,
      phone: phone ?? undefined,
      guardianName: guardianName ?? undefined,
      guardianContact: guardianContact ?? undefined,
      birthdate: birthdate ? new Date(birthdate) : undefined,
    }, include: { institute: true, volunteerProfile: true, experiences: { orderBy: { startDate: 'desc' } } } }));

    const results = await prisma.$transaction(ops);

    const updatedUser = results[results.length - 1];
    // updated profilePicUrl saved in DB (no debug logging)

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error(error);
    
    // Log error to audit database
    try {
      const session = await getServerSession(authOptions);
      const body = await request.json().catch(() => ({}));
      const { userAgent, ipAddress } = getRequestMetadata(request);
      
      await logError({
        userId: session?.user?.email ? (await prisma.user.findUnique({ 
          where: { email: session.user.email },
          select: { id: true }
        }))?.id : undefined,
        userEmail: session?.user?.email || undefined,
        endpoint: '/api/user/update',
        method: 'POST',
        error,
        requestBody: body,
        userAgent,
        ipAddress,
      });
    } catch (logErr) {
      console.error('Failed to log error:', logErr);
    }
    
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
