import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GROUP_TO_STATUSES, VALID_GROUPS, type DashboardGroup } from '@/lib/dashboard-groups';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_SORTS = ['uncalledFirst', 'addedOldest', 'addedNewest', 'score'] as const;
type DashboardSort = (typeof VALID_SORTS)[number];

function getOrderBy(sort: DashboardSort): Prisma.BusinessLeadOrderByWithRelationInput[] {
  switch (sort) {
    case 'addedOldest':
      return [{ createdAt: 'asc' }, { id: 'asc' }];
    case 'addedNewest':
      return [{ createdAt: 'desc' }, { id: 'asc' }];
    case 'score':
      return [{ leadScore: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }];
    default:
      return [
        { callLogs: { _count: 'asc' } },
        { leadScore: 'desc' },
        { createdAt: 'asc' },
        { id: 'asc' },
      ];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const group = searchParams.get('group') as DashboardGroup | null;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const requestedSort = searchParams.get('sort') ?? 'addedNewest';

  if (!group || !VALID_GROUPS.includes(group)) {
    return NextResponse.json({ error: `group must be one of: ${VALID_GROUPS.join(', ')}` }, { status: 400 });
  }

  if (!VALID_SORTS.includes(requestedSort as DashboardSort)) {
    return NextResponse.json({ error: `sort must be one of: ${VALID_SORTS.join(', ')}` }, { status: 400 });
  }

  try {
    const statuses = GROUP_TO_STATUSES[group];
    const [rows, total] = await Promise.all([
      prisma.businessLead.findMany({
        where: { leadStatus: { in: statuses } },
        orderBy: getOrderBy(requestedSort as DashboardSort),
        include: {
          callLogs: {
            orderBy: { calledAt: 'desc' },
            take: 1,
            select: { calledAt: true, outcome: true },
          },
          _count: { select: { callLogs: true } },
        },
        take: limit,
        skip: offset,
      }),
      prisma.businessLead.count({ where: { leadStatus: { in: statuses } } }),
    ]);
    const leads = rows.map(({ callLogs, _count, ...lead }) => ({
      ...lead,
      callCount: _count.callLogs,
      lastCalledAt: callLogs[0]?.calledAt ?? null,
      lastCallOutcome: callLogs[0]?.outcome ?? null,
    }));
    return NextResponse.json(
      { leads, total },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (err) {
    console.error('GET /api/dashboard/leads error:', err);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
