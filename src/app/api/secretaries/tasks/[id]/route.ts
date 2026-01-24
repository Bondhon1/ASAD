import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true } });
    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['SECRETARIES', 'MASTER'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const id = params.id;
    // delete related notifications first
    await prisma.notification.deleteMany({ where: { link: `/tasks/${id}` } });
    const deleted = await prisma.task.delete({ where: { id } });

    return NextResponse.json({ ok: true, task: deleted });
  } catch (err: any) {
    console.error('DELETE /api/secretaries/tasks/[id] error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const requester = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true } });
    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['SECRETARIES', 'MASTER'].includes(requester.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const id = params.id;
    const body = await req.json();
    const data: any = {};
    if (typeof body.title === 'string') data.title = body.title;
    if (typeof body.description === 'string') data.description = body.description;
    if (body.endDate) data.endDate = new Date(body.endDate);
    if (typeof body.pointsPositive === 'number') data.pointsPositive = Math.max(0, Math.floor(body.pointsPositive));
    if (typeof body.mandatory === 'boolean') data.mandatory = body.mandatory;
    if (typeof body.taskType === 'string') data.taskType = body.taskType;

    const updated = await prisma.task.update({ where: { id }, data });

    return NextResponse.json({ ok: true, task: updated });
  } catch (err: any) {
    console.error('PATCH /api/secretaries/tasks/[id] error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
