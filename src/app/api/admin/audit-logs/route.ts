import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { prismaAudit } from '@/lib/prisma-audit';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!user || !['MASTER', 'ADMIN', 'DATABASE_DEPT'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50');

    const where: any = {};

    // Filter by action type
    if (action && action !== 'ALL') {
      where.action = action;
    }

    // Filter by date range
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      prismaAudit.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prismaAudit.auditLog.count({ where }),
    ]);

    // Get available action types for filter dropdown
    const actionTypes = await prismaAudit.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });

    // Shape logs to match the UI contract (actor as nested object)
    const shapedLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      meta: log.meta,
      createdAt: log.createdAt,
      affectedVolunteerId: log.affectedVolunteerId,
      points: log.points,
      actor: {
        id: log.actorUserId,
        fullName: log.actorName ?? null,
        email: log.actorEmail ?? '',
        volunteerId: log.actorVolunteerId ?? null,
        role: log.actorRole ?? '',
      },
    }));

    // ── Batch-resolve every user/volunteer ID referenced in this page ──────────
    // Collect IDs from affectedVolunteerId and common meta keys so the client
    // never needs to fire individual /api/hr/users lookups (eliminates N+1).
    const idsToResolve = new Set<string>();
    for (const log of logs) {
      if (log.affectedVolunteerId) idsToResolve.add(log.affectedVolunteerId);
      try {
        const m = log.meta ? JSON.parse(log.meta) : null;
        const candidates = [
          m?.volunteerId, m?.volunteer_id,
          m?.userId,      m?.user_id,
          m?.affectedVolunteerId,
        ];
        candidates.forEach(c => { if (c && typeof c === 'string') idsToResolve.add(c); });
      } catch { /* ignore unparseable meta */ }
    }

    const resolvedVolunteers: Record<string, { fullName: string | null; email: string }> = {};
    if (idsToResolve.size > 0) {
      const idArr = Array.from(idsToResolve);
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { id:          { in: idArr } },
            { volunteerId: { in: idArr } },
            { email:       { in: idArr } },
          ],
        },
        select: { id: true, volunteerId: true, email: true, fullName: true },
      });
      for (const u of users) {
        const entry = { fullName: u.fullName, email: u.email };
        resolvedVolunteers[u.id]                       = entry;
        if (u.volunteerId) resolvedVolunteers[u.volunteerId] = entry;
        resolvedVolunteers[u.email]                    = entry;
      }
    }

    return NextResponse.json({
      logs: shapedLogs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      actionTypes: actionTypes.map(a => a.action),
      resolvedVolunteers,
    });
  } catch (err: any) {
    console.error('GET /api/admin/audit-logs error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
