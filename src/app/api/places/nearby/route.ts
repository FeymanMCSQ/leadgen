import { NextRequest, NextResponse } from 'next/server';
import { NearbySearchRequest, NormalizedPlace } from '@/types/places';

const BASE_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.primaryType',
  'places.types',
  'places.businessStatus',
  'places.googleMapsUri',
];

const ENRICHMENT_FIELDS = [
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.regularOpeningHours',
];

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_PLACES_API_KEY is not set');
    return NextResponse.json({ error: 'API key not configured on server' }, { status: 500 });
  }

  let body: NearbySearchRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { includedTypes, center, radius, maxResultCount, rankPreference, includeEnrichmentFields } = body;

  if (!includedTypes || includedTypes.length === 0) {
    return NextResponse.json({ error: 'At least one category is required' }, { status: 400 });
  }
  if (!radius || radius <= 0) {
    return NextResponse.json({ error: 'Radius must be greater than 0' }, { status: 400 });
  }
  if (maxResultCount < 1 || maxResultCount > 20) {
    return NextResponse.json({ error: 'Max results must be between 1 and 20' }, { status: 400 });
  }
  if (
    center.latitude < -90 || center.latitude > 90 ||
    center.longitude < -180 || center.longitude > 180
  ) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  const fieldMask = [
    ...BASE_FIELDS,
    ...(includeEnrichmentFields ? ENRICHMENT_FIELDS : []),
  ].join(',');

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount,
        rankPreference,
        locationRestriction: {
          circle: { center, radius },
        },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('Google Places API error:', errData);
      return NextResponse.json(
        { error: (errData as any)?.error?.message ?? 'Google Places API returned an error' },
        { status: res.status }
      );
    }

    const data = await res.json();
    const rawPlaces: any[] = data.places ?? [];

    const places: NormalizedPlace[] = rawPlaces.map((p: any) => ({
      placeId: p.id,
      name: p.displayName?.text ?? '',
      formattedAddress: p.formattedAddress,
      latitude: p.location?.latitude,
      longitude: p.location?.longitude,
      primaryType: p.primaryType,
      types: p.types,
      businessStatus: p.businessStatus,
      googleMapsUri: p.googleMapsUri,
      nationalPhoneNumber: p.nationalPhoneNumber,
      websiteUri: p.websiteUri,
      rating: p.rating,
      userRatingCount: p.userRatingCount,
    }));

    return NextResponse.json({ places, rawCount: rawPlaces.length });
  } catch (err) {
    console.error('Network error calling Google Places API:', err);
    return NextResponse.json(
      { error: 'Network error connecting to Google Places API' },
      { status: 500 }
    );
  }
}
