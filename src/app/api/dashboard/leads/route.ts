import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GROUP_TO_STATUSES, VALID_GROUPS, type DashboardGroup } from '@/lib/dashboard-groups';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const group = searchParams.get('group') as DashboardGroup | null;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  if (!group || !VALID_GROUPS.includes(group)) {
    return NextResponse.json({ error: `group must be one of: ${VALID_GROUPS.join(', ')}` }, { status: 400 });
  }

  try {
    const statuses = GROUP_TO_STATUSES[group];
    const [leads, total] = await Promise.all([
      prisma.businessLead.findMany({
        where: { leadStatus: { in: statuses } },
        orderBy: { leadScore: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.businessLead.count({ where: { leadStatus: { in: statuses } } }),
    ]);
    return NextResponse.json(
      { leads, total },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (err) {
    console.error('GET /api/dashboard/leads error:', err);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
