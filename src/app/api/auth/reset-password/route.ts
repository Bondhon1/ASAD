import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, password } = body || {};
    if (!token || !password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { emailVerificationToken: token } });
    if (!user) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });

    if (!user.emailVerificationExpiry || user.emailVerificationExpiry < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 400 });
    }

    const hashed = await hashPassword(password);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed, emailVerificationToken: null, emailVerificationExpiry: null } });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Reset password error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
