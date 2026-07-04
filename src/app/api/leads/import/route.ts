import { NextRequest, NextResponse } from 'next/server';
import { importPlacesToDatabase } from '@/lib/lead-importer';

const VALID_SOURCES = ['GOOGLE_NEARBY', 'GOOGLE_TEXT'] as const;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { places, source, mode, areaLabel, centerLat, centerLng, radiusMeters, textQuery, includedTypes } = body as any;

  if (!Array.isArray(places)) {
    return NextResponse.json({ error: 'places must be an array' }, { status: 400 });
  }
  if (!VALID_SOURCES.includes(source)) {
    return NextResponse.json({ error: 'source must be GOOGLE_NEARBY or GOOGLE_TEXT' }, { status: 400 });
  }
  if (!mode || typeof mode !== 'string') {
    return NextResponse.json({ error: 'mode is required' }, { status: 400 });
  }

  try {
    const summary = await importPlacesToDatabase({
      places,
      source,
      mode,
      areaLabel: areaLabel ?? undefined,
      centerLat: centerLat ?? undefined,
      centerLng: centerLng ?? undefined,
      radiusMeters: radiusMeters ?? undefined,
      textQuery: textQuery ?? undefined,
      includedTypes: includedTypes ?? undefined,
    });
    return NextResponse.json(summary);
  } catch (err) {
    console.error('Import error:', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
