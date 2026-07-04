import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CallOutcome, LeadStatus } from '@prisma/client';

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

  const newStatus = OUTCOME_TO_STATUS[body.outcome];

  try {
    const [callLog, updatedLead] = await prisma.$transaction([
      prisma.callLog.create({
        data: {
          businessLeadId: params.id,
          outcome: body.outcome,
          notes: body.notes,
          nextFollowUpAt: body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : undefined,
        },
      }),
      prisma.businessLead.update({
        where: { id: params.id },
        data: { leadStatus: newStatus },
      }),
    ]);
    return NextResponse.json({ callLog, updatedLead });
  } catch (err) {
    console.error('POST /api/leads/[id]/call-log error:', err);
    return NextResponse.json({ error: 'Call log failed' }, { status: 500 });
  }
}
