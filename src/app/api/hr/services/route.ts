import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true, status: true, id: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['HR', 'MASTER', 'ADMIN', 'DIRECTOR'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const services = await prisma.service.findMany({
      include: {
        _count: { select: { volunteerProfiles: true } },
        institute: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const mapped = services.map(s => ({ id: s.id, name: s.name, code: s.code, institute: s.institute, usersCount: s._count?.volunteerProfiles || 0 }));
    return NextResponse.json({ services: mapped });
  } catch (err: any) {
    console.error('GET /api/hr/services error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true, status: true, id: true } });
    if (!requester || requester.status === 'BANNED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['HR', 'MASTER', 'ADMIN'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden - only HR/MASTER/ADMIN can create services' }, { status: 403 });

    const body = await req.json();
    const { serviceName, instituteName, isGlobal } = body as { serviceName?: string; instituteName?: string; isGlobal?: boolean };
    if (!serviceName || !serviceName.trim()) return NextResponse.json({ error: 'Missing service name' }, { status: 400 });

    const svcName = serviceName.trim();
    let institute = null as any;
    let instituteId: string | undefined = undefined;

    if (!isGlobal) {
      if (!instituteName || !instituteName.trim()) return NextResponse.json({ error: 'Missing institute name' }, { status: 400 });
      const instName = instituteName.trim();
      // find or create institute
      institute = await prisma.institute.findUnique({ where: { name: instName } });
      if (!institute) {
        institute = await prisma.institute.create({ data: { name: instName } });
      }
      instituteId = institute.id;
    }

    // ensure service does not already exist for this institute (or globally)
    const existing = await prisma.service.findFirst({ where: { name: svcName, instituteId: instituteId || null } });
    if (existing) return NextResponse.json({ error: 'Service already exists for this institute/global' }, { status: 409 });

    // generate code (use service name and institute if available)
    const generateCode = (inst?: string, svc?: string) => {
      const a = (inst || '').split(/[^A-Za-z0-9]+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0,4);
      const b = (svc || '').split(/[^A-Za-z0-9]+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0,3);
      const base = (a || '') + (b ? '_' + b : '');
      return base.replace(/[^A-Z0-9_]/g, '').slice(0,10) || undefined;
    };

    let code = generateCode(institute?.name, svcName);
    // avoid code collision
    let suffix = 1;
    while (code && await prisma.service.findUnique({ where: { code } })) {
      code = (generateCode(institute?.name, svcName) || '') + '_' + suffix;
      suffix += 1;
      if (suffix > 1000) break;
    }

    const created = await prisma.service.create({ data: { name: svcName, code: code || undefined, createdById: requester.id, auto: false, instituteId: instituteId || undefined, isGlobal: !!isGlobal } });
    return NextResponse.json({ ok: true, service: created });
  } catch (err: any) {
    console.error('POST /api/hr/services error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
