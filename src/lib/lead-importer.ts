import { LeadSource, LeadStatus } from '@prisma/client';
import { NormalizedPlace } from '@/types/places';
import { prisma } from './prisma';
import { cleanPlace } from './lead-cleaner';

export type ImportPlacesParams = {
  places: NormalizedPlace[];
  source: LeadSource;
  mode: string;
  areaLabel?: string;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  textQuery?: string;
  includedTypes?: string[];
};

export type ImportSummary = {
  searchRunId: string;
  rawResultsCount: number;
  newLeadsCount: number;
  existingLeadsCount: number;
  todoCount: number;
  potentialCount: number;
  discardedCount: number;
  imported: Array<{
    googlePlaceId: string;
    name: string;
    wasNew: boolean;
    finalStatus: LeadStatus;
    leadScore: number;
  }>;
};

export async function importPlacesToDatabase(params: ImportPlacesParams): Promise<ImportSummary> {
  const { places, source, mode, areaLabel, centerLat, centerLng, radiusMeters, textQuery, includedTypes } = params;

  const searchRun = await prisma.searchRun.create({
    data: {
      mode,
      areaLabel,
      centerLat,
      centerLng,
      radiusMeters,
      textQuery,
      includedTypes: includedTypes ?? [],
      rawResultsCount: places.length,
    },
  });

  let newLeadsCount = 0;
  let existingLeadsCount = 0;
  let todoCount = 0;
  let potentialCount = 0;
  let discardedCount = 0;

  const imported: ImportSummary['imported'] = [];

  for (const place of places) {
    if (!place.placeId) continue;

    const cleaned = cleanPlace(place);

    const existing = await prisma.businessLead.findUnique({
      where: { googlePlaceId: place.placeId },
    });

    if (existing) {
      await prisma.businessLead.update({
        where: { googlePlaceId: place.placeId },
        data: {
          lastImportedAt: new Date(),
          ...(place.rating != null && { rating: place.rating }),
          ...(place.userRatingCount != null && { userRatingCount: place.userRatingCount }),
          ...(place.businessStatus && { businessStatus: place.businessStatus }),
          ...(place.googleMapsUri && { googleMapsUri: place.googleMapsUri }),
          ...(place.sourceQuery && { sourceQuery: place.sourceQuery }),
        },
      });

      await prisma.importEvent.create({
        data: {
          searchRunId: searchRun.id,
          businessLeadId: existing.id,
          googlePlaceId: place.placeId,
          wasNew: false,
          previousStatus: existing.leadStatus,
          finalStatus: existing.leadStatus,
          importReason: 'Seen again in search',
        },
      });

      existingLeadsCount++;
      imported.push({
        googlePlaceId: place.placeId,
        name: existing.name,
        wasNew: false,
        finalStatus: existing.leadStatus,
        leadScore: existing.leadScore,
      });
    } else {
      const newLead = await prisma.businessLead.create({
        data: {
          googlePlaceId: cleaned.googlePlaceId,
          name: cleaned.name,
          normalizedName: cleaned.normalizedName,
          primaryType: cleaned.primaryType,
          types: cleaned.types,
          categoryBucket: cleaned.categoryBucket,
          formattedAddress: cleaned.formattedAddress,
          suburb: cleaned.suburb,
          latitude: cleaned.latitude,
          longitude: cleaned.longitude,
          googleMapsUri: cleaned.googleMapsUri,
          websiteUri: cleaned.websiteUri,
          nationalPhoneNumber: cleaned.nationalPhoneNumber,
          rating: cleaned.rating,
          userRatingCount: cleaned.userRatingCount,
          businessStatus: cleaned.businessStatus,
          source,
          sourceQuery: cleaned.sourceQuery,
          searchAreaLabel: areaLabel,
          hasWebsite: cleaned.hasWebsite,
          hasPhone: cleaned.hasPhone,
          isChainLikely: cleaned.isChainLikely,
          gatekeeperRisk: cleaned.gatekeeperRisk,
          leadStatus: cleaned.leadStatus,
          leadScore: cleaned.leadScore,
          cleaningReasons: cleaned.cleaningReasons,
          lastImportedAt: new Date(),
        },
      });

      await prisma.importEvent.create({
        data: {
          searchRunId: searchRun.id,
          businessLeadId: newLead.id,
          googlePlaceId: place.placeId,
          wasNew: true,
          finalStatus: cleaned.leadStatus,
          importReason: 'New business from search',
        },
      });

      newLeadsCount++;
      if (cleaned.leadStatus === 'TODO') todoCount++;
      else if (cleaned.leadStatus === 'POTENTIAL_RESEARCH') potentialCount++;
      else if (cleaned.leadStatus === 'DISCARDED') discardedCount++;

      imported.push({
        googlePlaceId: place.placeId,
        name: cleaned.name,
        wasNew: true,
        finalStatus: cleaned.leadStatus,
        leadScore: cleaned.leadScore,
      });
    }
  }

  await prisma.searchRun.update({
    where: { id: searchRun.id },
    data: {
      completedAt: new Date(),
      newLeadsCount,
      existingLeadsCount,
      todoCount,
      potentialCount,
      discardedCount,
    },
  });

  return {
    searchRunId: searchRun.id,
    rawResultsCount: places.length,
    newLeadsCount,
    existingLeadsCount,
    todoCount,
    potentialCount,
    discardedCount,
    imported,
  };
}
