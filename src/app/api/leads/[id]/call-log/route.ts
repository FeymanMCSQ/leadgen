import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CallOutcome, LeadStatus } from '@prisma/client';
import { getLocalDate } from '@/lib/timezone';

const OUTCOME_TO_STATUS: Record<CallOutcome, LeadStatus> = {
  NO_ANSWER: 'CONTACTED',
  WRONG_NUMBER: 'POTENTIAL_RESEARCH',
  GATEKEEPER: 'PENDING',
  OWNER_UNAVAILABLE: 'PENDING',
  PERMISSION_TO_SEND: 'PENDING',
  SENT_LINK: 'PENDING',
  NOT_INTERESTED: 'DEAD_END',
  FOLLOW_UP: 'PENDING',
  CLOSED: 'SUCCEEDED',
  DO_NOT_CALL: 'DO_NOT_CALL',
  OTHER: 'CONTACTED',
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let body: { outcome?: CallOutcome; notes?: string; nextFollowUpAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.outcome || !(body.outcome in OUTCOME_TO_STATUS)) {
    return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 });
  }

  const outcome = body.outcome;
  const newStatus = OUTCOME_TO_STATUS[outcome];

  try {
    const settings = await prisma.appSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', dailyCallQuota: 5, timezone: 'Australia/Sydney' },
    });
    const localDate = getLocalDate(settings.timezone);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.businessLead.findUnique({ where: { id: params.id } });
      if (!existing) return null;

      const alreadyCounted = await tx.leadStatusChange.findFirst({
        where: { businessLeadId: params.id, localDate, countedForDailyQuota: true },
      });
      const quotaCounted = !alreadyCounted;

      const callLog = await tx.callLog.create({
        data: {
          businessLeadId: params.id,
          outcome,
          notes: body.notes,
          nextFollowUpAt: body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : undefined,
        },
      });
      const updatedLead = await tx.businessLead.update({
        where: { id: params.id },
        data: { leadStatus: newStatus },
      });

      if (existing.leadStatus !== newStatus || quotaCounted) {
        await tx.leadStatusChange.create({
          data: {
            businessLeadId: params.id,
            fromStatus: existing.leadStatus,
            toStatus: newStatus,
            countedForDailyQuota: quotaCounted,
            localDate,
          },
        });
      }

      return { callLog, updatedLead, quotaCounted };
    });

    if (!result) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    return NextResponse.json(result);
  } catch (err) {
    console.error('POST /api/leads/[id]/call-log error:', err);
    return NextResponse.json({ error: 'Call log failed' }, { status: 500 });
  }
}
