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

    const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json({ services });
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
    const { name, code, description, auto } = body as { name?: string; code?: string; description?: string; auto?: boolean };
    if (!name || !name.trim()) return NextResponse.json({ error: 'Missing service name' }, { status: 400 });

    const existing = await prisma.service.findUnique({ where: { name } });
    if (existing) return NextResponse.json({ error: 'Service already exists' }, { status: 409 });

    const created = await prisma.service.create({ data: { name: name.trim(), code: code?.trim() || undefined, description: description || undefined, createdById: requester.id, auto: !!auto } });
    return NextResponse.json({ ok: true, service: created });
  } catch (err: any) {
    console.error('POST /api/hr/services error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
