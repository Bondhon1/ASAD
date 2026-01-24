import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, status: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Find tasks that are currently active and targeted to this user
    const now = new Date();

    // Query tasks where assignedGroupType = ALL OR matching user's profile
    const user = await prisma.user.findUnique({ where: { id: requester.id }, include: { volunteerProfile: true } });

    const conditions: any[] = [
      { assignedGroupType: 'ALL' },
      { startDate: { lte: now }, endDate: { gte: now } },
    ];

    // We'll fetch tasks and filter in JS for complex matching
    const tasks = await prisma.task.findMany({ orderBy: { createdAt: 'desc' } });

    const filtered = tasks.filter(t => {
      if (t.startDate && t.startDate > now) return false;
      if (t.endDate && t.endDate < now) return false;
      if (t.assignedGroupType === 'ALL') return true;
      if (!user) return false;
      const vp: any = user.volunteerProfile;
      if (!vp) return false;
      if (t.assignedGroupType === 'SERVICE' && vp.serviceId && t.assignedGroup === vp.serviceId) return true;
      if (t.assignedGroupType === 'SECTOR' && Array.isArray(vp.sectors) && vp.sectors.includes(t.assignedGroup || '')) return true;
      if (t.assignedGroupType === 'CLUB' && Array.isArray(vp.clubs) && vp.clubs.includes(t.assignedGroup || '')) return true;
      if (t.assignedGroupType === 'COMMITTEE') {
        // check if user is member of the committee
        return vp.committeeId && vp.committeeId === t.assignedGroup;
      }
      if (t.assignedGroupType === 'DEPARTMENT') {
        // department check via committee
        return false;
      }
      return false;
    });

    return NextResponse.json({ tasks: filtered });
  } catch (err: any) {
    console.error('GET /api/tasks error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
