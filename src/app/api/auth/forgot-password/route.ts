import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateEmailVerificationToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toLowerCase().trim();
    if (!email) return NextResponse.json({ ok: true }); // don't reveal

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Always return ok to avoid user enumeration
      return NextResponse.json({ ok: true });
    }

    const token = generateEmailVerificationToken();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({ where: { id: user.id }, data: { emailVerificationToken: token, emailVerificationExpiry: expiry } });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail({ email: user.email, fullName: user.fullName || user.username || user.email, resetLink });
    } catch (e) {
      console.error('Failed to send password reset email', e);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Forgot password error', err);
    return NextResponse.json({ ok: true });
  }
}
