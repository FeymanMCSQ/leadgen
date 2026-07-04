import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function getOrCreateSettings() {
  return prisma.appSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', dailyCallQuota: 5, timezone: 'Australia/Sydney' },
  });
}

export async function GET() {
  try {
    const settings = await getOrCreateSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error('GET /api/settings error:', err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  let body: { dailyCallQuota?: number; timezone?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const data: { dailyCallQuota?: number; timezone?: string } = {};

  if (body.dailyCallQuota !== undefined) {
    const q = Number(body.dailyCallQuota);
    if (!Number.isInteger(q) || q < 1 || q > 200) {
      return NextResponse.json({ error: 'dailyCallQuota must be an integer between 1 and 200' }, { status: 400 });
    }
    data.dailyCallQuota = q;
  }
  if (body.timezone !== undefined) {
    if (typeof body.timezone !== 'string' || !body.timezone.trim()) {
      return NextResponse.json({ error: 'timezone must be a non-empty string' }, { status: 400 });
    }
    data.timezone = body.timezone.trim();
  }

  try {
    const settings = await prisma.appSettings.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', dailyCallQuota: data.dailyCallQuota ?? 5, timezone: data.timezone ?? 'Australia/Sydney' },
    });
    return NextResponse.json(settings);
  } catch (err) {
    console.error('PATCH /api/settings error:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
