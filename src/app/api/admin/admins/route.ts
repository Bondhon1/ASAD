import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN']
        }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        profilePicUrl: true,
      },
      orderBy: {
        role: 'asc'
      }
    });

    return NextResponse.json({ admins }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch admins:', error);
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
  }
}
