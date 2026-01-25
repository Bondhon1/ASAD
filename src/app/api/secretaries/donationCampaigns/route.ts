import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST() {
  return NextResponse.json({ error: 'This endpoint has been removed' }, { status: 410 });
}
