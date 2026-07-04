export type NormalizedPlace = {
  placeId: string;
  name: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  primaryType?: string;
  types?: string[];
  businessStatus?: string;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  sourceQuery?: string;
  distanceMeters?: number;
};

export type SearchMode = 'nearby' | 'text';
export type RankPreference = 'DISTANCE' | 'POPULARITY';

export interface NearbySearchRequest {
  includedTypes: string[];
  center: { latitude: number; longitude: number };
  radius: number;
  maxResultCount: number;
  rankPreference: RankPreference;
  includeEnrichmentFields: boolean;
}

export interface TextSearchRequest {
  textQuery: string;
  maxResultCount: number;
  includeEnrichmentFields: boolean;
}

export interface SearchResponse {
  places: NormalizedPlace[];
  rawCount: number;
  error?: string;
}

export interface SearchStats {
  rawReturned: number;
  newAdded: number;
  duplicatesSkipped: number;
  totalUnique: number;
}
