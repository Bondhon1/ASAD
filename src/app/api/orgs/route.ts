import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const sectors = await prisma.sector.findMany({ select: { id: true, name: true }, orderBy: { createdAt: 'asc' } });
    const clubs = await prisma.club.findMany({ select: { id: true, name: true }, orderBy: { createdAt: 'asc' } });
    const services = await prisma.service.findMany({ select: { id: true, name: true }, orderBy: { createdAt: 'asc' } });

    return NextResponse.json(
      { sectors, clubs, services },
      {
        headers: {
          // Cache for 5 minutes - this data rarely changes
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err: any) {
    console.error('GET /api/orgs error', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
