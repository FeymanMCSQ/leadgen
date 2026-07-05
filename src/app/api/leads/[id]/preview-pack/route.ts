import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import JSZip from 'jszip';

const FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'primaryType',
  'types',
  'businessStatus',
  'googleMapsUri',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteUri',
  'rating',
  'userRatingCount',
  'regularOpeningHours',
  'photos',
  'reviews',
].join(',');

function sanitizeBusinessName(rawName: string | undefined | null): string {
  if (!rawName) return '';
  return rawName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
    .slice(0, 80);
}

type GoogleReview = {
  name?: string;
  relativePublishTimeDescription?: string;
  text?: { text?: string; languageCode?: string };
  originalText?: { text?: string; languageCode?: string };
  rating?: number;
  authorAttribution?: {
    displayName?: string;
    uri?: string;
    photoUri?: string;
  };
  publishTime?: string;
  googleMapsUri?: string;
};

function testimonialFromReview(review: GoogleReview) {
  const text = review.text?.text?.trim() || review.originalText?.text?.trim() || '';
  return {
    author: review.authorAttribution?.displayName ?? '',
    authorUri: review.authorAttribution?.uri ?? '',
    authorPhotoUri: review.authorAttribution?.photoUri ?? '',
    rating: review.rating ?? 0,
    text,
    relativePublishTimeDescription: review.relativePublishTimeDescription ?? '',
    publishTime: review.publishTime ?? '',
    googleMapsUri: review.googleMapsUri ?? '',
  };
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_PLACES_API_KEY is not set');
    return NextResponse.json({ error: 'API key not configured on server' }, { status: 500 });
  }

  const lead = await prisma.businessLead.findUnique({ where: { id: params.id } });
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }
  if (!lead.googlePlaceId) {
    return NextResponse.json({ error: 'Lead has no Google Place ID' }, { status: 400 });
  }

  let place: any;
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${lead.googlePlaceId}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('Google Place Details error:', errData);
      return NextResponse.json(
        { error: errData?.error?.message ?? 'Google Places API returned an error' },
        { status: 502 }
      );
    }
    place = await res.json();
  } catch (err) {
    console.error('Network error calling Google Place Details API:', err);
    return NextResponse.json(
      { error: 'Network error connecting to Google Places API' },
      { status: 502 }
    );
  }

  const zip = new JSZip();
  const photosFolder = zip.folder('photos');
  const photoEntries: { filename: string; widthPx: number; heightPx: number }[] = [];

  const rawPhotos: { name?: string; widthPx?: number; heightPx?: number }[] = Array.isArray(place.photos)
    ? place.photos.slice(0, 5)
    : [];

  for (const photo of rawPhotos) {
    if (!photo?.name) continue;
    try {
      const photoRes = await fetch(
        `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1200&key=${apiKey}`
      );
      if (!photoRes.ok) continue;

      const contentType = photoRes.headers.get('content-type') ?? '';
      let ext = 'jpg';
      if (contentType.includes('png')) ext = 'png';
      else if (contentType.includes('webp')) ext = 'webp';

      const buffer = Buffer.from(await photoRes.arrayBuffer());
      const index = photoEntries.length + 1;
      photosFolder?.file(`photo-${index}.${ext}`, buffer);
      photoEntries.push({
        filename: `photos/photo-${index}.${ext}`,
        widthPx: photo.widthPx ?? 0,
        heightPx: photo.heightPx ?? 0,
      });
    } catch (err) {
      console.error('Failed to fetch a place photo, skipping:', err);
    }
  }

  const businessName = place.displayName?.text ?? lead.name;
  const rawReviews: GoogleReview[] = Array.isArray(place.reviews) ? place.reviews : [];
  const testimonials = rawReviews
    .filter((review) => (review.rating ?? 0) >= 4)
    .map(testimonialFromReview)
    .filter((review) => review.text.length > 0)
    .slice(0, 4);

  const businessJson = {
    placeId: place.id ?? lead.googlePlaceId,
    name: businessName ?? '',
    address: place.formattedAddress ?? lead.formattedAddress ?? '',
    latitude: place.location?.latitude ?? lead.latitude ?? 0,
    longitude: place.location?.longitude ?? lead.longitude ?? 0,
    primaryType: place.primaryType ?? lead.primaryType ?? '',
    types: place.types ?? lead.types ?? [],
    businessStatus: place.businessStatus ?? lead.businessStatus ?? '',
    googleMapsUri: place.googleMapsUri ?? lead.googleMapsUri ?? '',
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? lead.nationalPhoneNumber ?? '',
    website: place.websiteUri ?? lead.websiteUri ?? '',
    rating: place.rating ?? lead.rating ?? 0,
    reviewCount: place.userRatingCount ?? lead.userRatingCount ?? 0,
    openingHours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    testimonials,
    photos: photoEntries,
    fetchedAt: new Date().toISOString(),
    source: 'Google Places API',
  };

  zip.file('business.json', JSON.stringify(businessJson, null, 2));

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

  const sanitized = sanitizeBusinessName(businessName);
  const filename = sanitized ? `preview-pack-${sanitized}.zip` : 'preview-pack-business.zip';

  const zipBlob = new Blob([zipBuffer], { type: 'application/zip' });

  return new NextResponse(zipBlob, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
