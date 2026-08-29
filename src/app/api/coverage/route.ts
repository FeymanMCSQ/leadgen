import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const runs = await prisma.searchRun.findMany({
      where: {
        mode: 'nearby',
        centerLat: { not: null },
        centerLng: { not: null },
        completedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: 5000,
      select: {
        id: true,
        centerLat: true,
        centerLng: true,
        radiusMeters: true,
        includedTypes: true,
        rawResultsCount: true,
        completedAt: true,
      },
    });

    return NextResponse.json(
      { runs },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('GET /api/coverage error:', error);
    return NextResponse.json({ error: 'Failed to load coverage history' }, { status: 500 });
  }
}
