import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const status = searchParams.get('status') as LeadStatus | null;
  const categoryBucket = searchParams.get('categoryBucket');
  const primaryType = searchParams.get('primaryType');
  const hasWebsite = searchParams.get('hasWebsite');
  const hasPhone = searchParams.get('hasPhone');
  const minScore = searchParams.get('minScore');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const sort = searchParams.get('sort') ?? 'leadScore';
  const order = (searchParams.get('order') ?? 'desc') as 'asc' | 'desc';

  const where: Record<string, unknown> = {};
  if (status) where.leadStatus = status;
  if (categoryBucket) where.categoryBucket = categoryBucket;
  if (primaryType) where.primaryType = primaryType;
  if (hasWebsite !== null) where.hasWebsite = hasWebsite === 'true';
  if (hasPhone !== null) where.hasPhone = hasPhone === 'true';
  if (minScore !== null) where.leadScore = { gte: parseInt(minScore, 10) };

  const validSorts = ['leadScore', 'createdAt', 'updatedAt', 'name'] as const;
  const orderBy = validSorts.includes(sort as any) ? sort : 'leadScore';

  try {
    const [leads, total] = await Promise.all([
      prisma.businessLead.findMany({
        where,
        orderBy: { [orderBy]: order },
        take: limit,
        skip: offset,
      }),
      prisma.businessLead.count({ where }),
    ]);
    return NextResponse.json({ leads, total });
  } catch (err) {
    console.error('GET /api/leads error:', err);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
