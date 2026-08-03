import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLocalDate } from '@/lib/timezone';
import { GROUP_TO_STATUSES } from '@/lib/dashboard-groups';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await prisma.appSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', dailyCallQuota: 5, timezone: 'Australia/Sydney' },
    });

    const localDate = getLocalDate(settings.timezone);

    const [completedToday, ...groupCounts] = await Promise.all([
      prisma.leadStatusChange.count({
        where: { localDate, countedForDailyQuota: true },
      }),
      prisma.businessLead.count({ where: { leadStatus: { in: GROUP_TO_STATUSES.todo } } }),
      prisma.businessLead.count({ where: { leadStatus: { in: GROUP_TO_STATUSES.potential } } }),
      prisma.businessLead.count({ where: { leadStatus: { in: GROUP_TO_STATUSES.inProgress } } }),
      prisma.businessLead.count({ where: { leadStatus: { in: GROUP_TO_STATUSES.approved } } }),
      prisma.businessLead.count({ where: { leadStatus: { in: GROUP_TO_STATUSES.declined } } }),
    ]);

    const [todo, potential, inProgress, approved, declined] = groupCounts;

    return NextResponse.json(
      {
        quota: settings.dailyCallQuota,
        completedToday,
        remainingToday: Math.max(0, settings.dailyCallQuota - completedToday),
        timezone: settings.timezone,
        localDate,
        countsByGroup: { todo, potential, inProgress, approved, declined },
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (err) {
    console.error('GET /api/dashboard/summary error:', err);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}
