import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { autoAssignServiceFromInstitute } from '@/lib/organizations';
import { invalidateAll } from '@/lib/hrUsersCache';

export async function GET(req: Request, context: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ 
      where: { email: session.user.email }, 
      select: { role: true, status: true } 
    });
    
    if (!requester || requester.status === 'BANNED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!['HR', 'MASTER', 'ADMIN', 'DIRECTOR', 'DATABASE_DEPT'].includes(requester.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const id = params?.id as string;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    // Fetch detailed user data - only called when user details are expanded
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        username: true,
        status: true,
        role: true,
        volunteerId: true,
        createdAt: true,
        institute: { select: { name: true } },
        volunteerProfile: { 
          select: { 
            points: true, 
            isOfficial: true, 
            rank: { select: { id: true, name: true } }, 
            service: { select: { id: true, name: true } }, 
            sectors: true, 
            clubs: true 
          } 
        },
        initialPayment: { 
          select: { 
            status: true, 
            verifiedAt: true, 
            approvedBy: { select: { id: true, fullName: true, email: true } } 
          } 
        },
        finalPayment: { 
          select: { 
            status: true, 
            verifiedAt: true, 
            approvedBy: { select: { id: true, fullName: true, email: true } } 
          } 
        },
        interviewApprovedBy: { select: { id: true, fullName: true, email: true } },
        _count: {
          select: {
            taskSubmissions: true,
            donations: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      { user },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (err: any) {
    console.error('GET /api/hr/users/[id] error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true, status: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Allow Database Dept to call this endpoint for profile/points/rank edits; other operations are guarded below.
    if (!['HR', 'MASTER', 'ADMIN', 'DIRECTOR', 'DATABASE_DEPT'].includes(requester.role as string)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // `params` may be a Promise in Next.js app routes — await it safely
    const params = await context.params;
    let id = params?.id as string | undefined;
    if (!id) {
      // fallback: extract last path segment from URL
      try {
        const url = new URL(req.url);
        const parts = url.pathname.split('/').filter(Boolean);
        id = parts[parts.length - 1];
      } catch (e) {
        id = undefined;
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }
    const body = await req.json();
    const { points, rank, volunteerId, status, role, serviceId, sectors, clubs } = body as { points?: number; rank?: string; volunteerId?: string | null; status?: string; role?: string; serviceId?: string | null; sectors?: string[] | null; clubs?: string[] | null };

    const hasPoints = typeof points === 'number';
    const hasRank = typeof rank === 'string' && rank.trim().length > 0;
    const hasVolunteerId = Object.prototype.hasOwnProperty.call(body, 'volunteerId');
    const hasStatus = Object.prototype.hasOwnProperty.call(body, 'status');
    const hasRole = Object.prototype.hasOwnProperty.call(body, 'role');
    const hasServiceId = Object.prototype.hasOwnProperty.call(body, 'serviceId');
    const hasSectors = Object.prototype.hasOwnProperty.call(body, 'sectors');
    const hasClubs = Object.prototype.hasOwnProperty.call(body, 'clubs');

    if (!hasPoints && !hasRank && !hasVolunteerId && !hasStatus && !hasRole && !hasServiceId && !hasSectors && !hasClubs) return NextResponse.json({ error: 'No changes provided' }, { status: 400 });

    // If volunteerId update requested, only HR/MASTER/ADMIN can change volunteerId
    if (hasVolunteerId) {
      if (!['HR', 'MASTER', 'ADMIN'].includes(requester.role as string)) {
        return NextResponse.json({ error: 'Forbidden - cannot update volunteerId' }, { status: 403 });
      }
      try {
        await prisma.user.update({ where: { id }, data: { volunteerId: volunteerId === null ? null : volunteerId } });
      } catch (err: any) {
        // Handle Prisma unique constraint for volunteerId specially
        console.error('PATCH /api/hr/users/[id] volunteerId update error', err);
        try {
          const code = err?.code;
          const meta = err?.meta;
          const target = Array.isArray(meta?.target) ? meta.target : [];
          if (code === 'P2002' && target.includes('volunteerId')) {
            return NextResponse.json({ error: 'Volunteer ID already in use' }, { status: 409 });
          }
        } catch (e) {
          // fallthrough to generic error
        }
        return NextResponse.json({ error: err?.message || 'Failed to update volunteerId' }, { status: 500 });
      }
    }

    // If status change requested, only HR/MASTER/ADMIN can change status (Database Dept cannot)
    if (hasStatus) {
      if (!['HR', 'MASTER', 'ADMIN'].includes(requester.role as string)) {
        return NextResponse.json({ error: 'Forbidden - cannot update status' }, { status: 403 });
      }
      try {
        // include institute name so we can auto-assign services for OFFICIAL users
        const updatedUser = await prisma.user.update({ where: { id }, data: { status: status as any }, include: { institute: { select: { name: true } } } });

        // If user was banned, remove all active sessions so they are immediately logged out
        if (status === 'BANNED') {
          await prisma.session.deleteMany({ where: { userId: id } });
        }

        // If user just became OFFICIAL, auto-assign service when possible
        if (status === 'OFFICIAL') {
          try {
            const instituteName = updatedUser.institute?.name || null;
            const autoServiceName = autoAssignServiceFromInstitute(instituteName);
            if (autoServiceName) {
              // find a Service with matching name and marked auto
              const serviceRecord = await prisma.service.findFirst({ where: { name: autoServiceName, auto: true } });
              if (serviceRecord) {
                const profile = await prisma.volunteerProfile.findUnique({ where: { userId: id } });
                if (profile) {
                  await prisma.volunteerProfile.update({ where: { userId: id }, data: { serviceId: serviceRecord.id } });
                } else {
                  await prisma.volunteerProfile.create({ data: { userId: id, points: 0, serviceId: serviceRecord.id } });
                }
              }
            }
          } catch (e) {
            console.error('Auto-assign service error', e);
          }
        }

        // Invalidate cached users list immediately so HR sees fresh data
        try { invalidateAll(); } catch (e) { /* ignore */ }

        return NextResponse.json({ ok: true, user: updatedUser });
      } catch (err: any) {
        console.error('PATCH /api/hr/users/[id] status update error', err);
        return NextResponse.json({ error: err?.message || 'Failed to update status' }, { status: 500 });
      }
    }

    // If role change requested, only ADMIN (and MASTER) can change user roles
    if (hasRole) {
      try {
        if (requester.role !== 'ADMIN' && requester.role !== 'MASTER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        // Only allow role changes when the requester is an OFFICIAL user
        if (requester.status !== 'OFFICIAL') return NextResponse.json({ error: 'Forbidden - requester must be OFFICIAL' }, { status: 403 });

        // Prevent assigning the MASTER role - it's reserved for dev/test/debug accounts
        if ((role as string)?.toUpperCase() === 'MASTER') {
          return NextResponse.json({ error: 'Forbidden - cannot assign MASTER role' }, { status: 403 });
        }

        const updatedUser = await prisma.user.update({ where: { id }, data: { role: role as any } });
        try { invalidateAll(); } catch (e) { /* ignore */ }
        return NextResponse.json({ ok: true, user: updatedUser });
      } catch (err: any) {
        console.error('PATCH /api/hr/users/[id] role update error', err);
        return NextResponse.json({ error: err?.message || 'Failed to update role' }, { status: 500 });
      }
    }

    // Permissions: HR/MASTER/ADMIN can update service; DIRECTOR/MASTER/ADMIN can update sectors/clubs
    if (hasServiceId && !['HR', 'MASTER', 'ADMIN'].includes(requester.role as string)) {
      return NextResponse.json({ error: 'Forbidden - only HR/MASTER/ADMIN can update service' }, { status: 403 });
    }
    if ((hasSectors || hasClubs) && !['DIRECTOR', 'MASTER', 'ADMIN'].includes(requester.role as string)) {
      return NextResponse.json({ error: 'Forbidden - only DIRECTOR/MASTER/ADMIN can update sectors/clubs' }, { status: 403 });
    }

    // Prepare prisma update/create payload for volunteerProfile
    const prismaDataAny: any = {};
    if (hasPoints) prismaDataAny.points = points;
    // Resolve Rank by name (do NOT create new ranks - they should be predefined)
    if (hasRank) {
      const rankRecord = await prisma.rank.findUnique({ where: { name: rank! } });
      if (!rankRecord) {
        return NextResponse.json({ error: `Rank "${rank}" not found. Please use an existing rank.` }, { status: 400 });
      }
      prismaDataAny.rankId = rankRecord.id;
    }
    // service/sectors/clubs updates
    if (hasServiceId) prismaDataAny.serviceId = serviceId === null ? null : serviceId;
    if (hasSectors) prismaDataAny.sectors = sectors === null ? [] : sectors;
    if (hasClubs) prismaDataAny.clubs = clubs === null ? [] : clubs;

    // If no volunteerProfile changes were requested, return success for volunteerId update
    if (!hasPoints && !hasRank && !hasServiceId && !hasSectors && !hasClubs) {
      // return updated user and existing profile
      const user = await prisma.user.findUnique({ where: { id }, include: { volunteerProfile: { include: { rank: true, service: { select: { id: true, name: true } } } }, initialPayment: true, finalPayment: true } });
      return NextResponse.json({ ok: true, user });
    }

    // Ensure volunteerProfile exists
    const profile = await prisma.volunteerProfile.findUnique({ where: { userId: id } });
    if (!profile) {
      const createData: any = { userId: id, points: hasPoints ? points : 0 };
      if (hasRank) createData.rankId = prismaDataAny.rankId;
      if (hasServiceId) createData.serviceId = prismaDataAny.serviceId;
      if (hasSectors) createData.sectors = prismaDataAny.sectors;
      if (hasClubs) createData.clubs = prismaDataAny.clubs;
      const created = await prisma.volunteerProfile.create({ data: createData, include: { rank: true, service: { select: { id: true, name: true } } } });
      return NextResponse.json({ ok: true, profile: created });
    }

    const updated = await prisma.volunteerProfile.update({ where: { userId: id }, data: prismaDataAny, include: { rank: true, service: { select: { id: true, name: true } } } });
    return NextResponse.json({ ok: true, profile: updated });
  } catch (err: any) {
    console.error('PATCH /api/hr/users/[id] error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true, status: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['HR', 'MASTER', 'ADMIN', 'DIRECTOR'].includes(requester.role as string)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const params = await context.params;
    let id = params?.id as string | undefined;
    if (!id) {
      try {
        const url = new URL(req.url);
        const parts = url.pathname.split('/').filter(Boolean);
        id = parts[parts.length - 1];
      } catch (e) {
        id = undefined;
      }
    }

    if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

    // Delete user — Prisma cascade rules in schema will remove related rows as configured
    await prisma.user.delete({ where: { id } });

    // Clear users cache so UI reflects the deletion immediately
    try { invalidateAll(); } catch (e) { /* ignore */ }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /api/hr/users/[id] error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
