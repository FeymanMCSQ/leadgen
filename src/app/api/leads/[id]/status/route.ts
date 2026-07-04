import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LeadStatus } from '@prisma/client';

const VALID_STATUSES = Object.values(LeadStatus);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: { leadStatus?: LeadStatus; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.leadStatus || !VALID_STATUSES.includes(body.leadStatus)) {
    return NextResponse.json({ error: 'Invalid leadStatus' }, { status: 400 });
  }

  try {
    const updated = await prisma.businessLead.update({
      where: { id: params.id },
      data: {
        leadStatus: body.leadStatus,
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('PATCH /api/leads/[id]/status error:', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
