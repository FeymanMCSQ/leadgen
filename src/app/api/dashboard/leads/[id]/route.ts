import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@prisma/client';
import { getLocalDate, getAppTimezone } from '@/lib/timezone';

const VALID_STATUSES = Object.values(LeadStatus);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: { leadStatus?: LeadStatus; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (body.leadStatus && !VALID_STATUSES.includes(body.leadStatus)) {
    return NextResponse.json({ error: 'Invalid leadStatus' }, { status: 400 });
  }

  try {
    const existing = await prisma.businessLead.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    let quotaCounted = false;
    const updateData: { leadStatus?: LeadStatus; notes?: string } = {};

    if (body.leadStatus && body.leadStatus !== existing.leadStatus) {
      updateData.leadStatus = body.leadStatus;

      const timezone = getAppTimezone();
      const localDate = getLocalDate(timezone);
      const fromStatus = existing.leadStatus;
      const toStatus = body.leadStatus;

      const shouldCount =
        fromStatus === 'TODO' &&
        toStatus !== 'TODO' &&
        !(await prisma.leadStatusChange.findFirst({
          where: { businessLeadId: params.id, localDate, countedForDailyQuota: true },
        }));

      await prisma.leadStatusChange.create({
        data: {
          businessLeadId: params.id,
          fromStatus,
          toStatus,
          countedForDailyQuota: shouldCount,
          localDate,
        },
      });

      quotaCounted = shouldCount;
    }

    if (body.notes !== undefined) updateData.notes = body.notes;

    const updated = await prisma.businessLead.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ lead: updated, quotaCounted });
  } catch (err) {
    console.error('PATCH /api/dashboard/leads/[id] error:', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
