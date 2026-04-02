import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const contacts = await prisma.user.findMany({
      where: {
        status: 'OFFICIAL',
        role: {
          in: ['ADMIN']
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        volunteerId: true,
        role: true,
        status: true,
        profilePicUrl: true,
      },
      orderBy: [
        { role: 'asc' },
        { fullName: 'asc' },
      ],
    });

    return NextResponse.json({ contacts }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch support contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch support contacts' }, { status: 500 });
  }
}
