import { GatekeeperRisk, LeadStatus } from '@prisma/client';
import { NormalizedPlace } from '@/types/places';

export type CleanedLead = {
  googlePlaceId: string;
  name: string;
  normalizedName: string;
  primaryType?: string;
  types: string[];
  categoryBucket?: string;
  formattedAddress?: string;
  suburb?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUri?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  sourceQuery?: string;
  hasWebsite: boolean;
  hasPhone: boolean;
  isChainLikely: boolean;
  gatekeeperRisk: GatekeeperRisk;
  leadStatus: LeadStatus;
  leadScore: number;
  cleaningReasons: string[];
};

const CHAIN_KEYWORDS = [
  'mcdonald', 'kfc', 'subway', 'domino', 'hungry jack', 'oporto', 'guzman',
  'coles', 'woolworths', 'aldi', 'iga', '7-eleven', 'bp', 'shell', 'caltex',
  'ampol', 'chemist warehouse', 'priceline', 'officeworks', 'bunnings',
  'kmart', 'target', 'big w', 'anytime fitness', 'snap fitness', 'plus fitness',
  'f45', 'orange theory', 'boost juice', 'starbucks', 'gloria jeans',
];

const HIGH_RISK_TYPES = [
  'lawyer', 'accounting', 'dentist', 'dental_clinic', 'doctor', 'medical_clinic',
  'hospital', 'real_estate_agency', 'insurance_agency', 'corporate_office', 'bank',
  'university', 'school',
];
const MEDIUM_RISK_TYPES = ['restaurant', 'cafe', 'gym', 'physiotherapist', 'chiropractor', 'veterinary_care'];
const LOW_RISK_TYPES = [
  'barber_shop', 'hair_salon', 'beauty_salon', 'nail_salon', 'car_repair', 'laundry',
  'tailor', 'florist', 'pet_store', 'pet_care', 'massage', 'spa', 'yoga_studio',
  'electrician', 'plumber', 'painter', 'roofing_contractor', 'locksmith',
  'moving_company', 'car_wash', 'tire_shop',
];

const CATEGORY_MAP: Record<string, string> = {
  barber_shop: 'Beauty', hair_salon: 'Beauty', beauty_salon: 'Beauty',
  nail_salon: 'Beauty', beautician: 'Beauty', makeup_artist: 'Beauty',
  massage: 'Beauty', massage_spa: 'Beauty', spa: 'Beauty',
  skin_care_clinic: 'Beauty', tanning_studio: 'Beauty',
  car_repair: 'Auto', car_wash: 'Auto', tire_shop: 'Auto', auto_parts_store: 'Auto',
  electrician: 'Trades', plumber: 'Trades', painter: 'Trades',
  roofing_contractor: 'Trades', locksmith: 'Trades', moving_company: 'Trades',
  pet_store: 'Pets', pet_care: 'Pets', pet_boarding_service: 'Pets', veterinary_care: 'Pets',
  bakery: 'Food', cake_shop: 'Food', coffee_shop: 'Food', cafe: 'Food',
  restaurant: 'Food', catering_service: 'Food',
  dentist: 'Health', physiotherapist: 'Health', doctor: 'Health',
  medical_clinic: 'Health', hospital: 'Health', chiropractor: 'Health',
  lawyer: 'Professional Services', accounting: 'Professional Services',
  insurance_agency: 'Professional Services', real_estate_agency: 'Professional Services',
  gym: 'Fitness', fitness_center: 'Fitness', yoga_studio: 'Fitness',
  sports_coaching: 'Fitness', sports_school: 'Fitness',
};

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '');
}

function extractSuburb(address?: string): string | undefined {
  if (!address) return undefined;
  const parts = address.split(',').map((p) => p.trim());
  if (parts.length >= 3) return parts[parts.length - 3];
  if (parts.length === 2) return parts[0];
  return undefined;
}

function detectChain(normalizedName: string, types: string[]): boolean {
  if (CHAIN_KEYWORDS.some((kw) => normalizedName.includes(kw))) return true;
  if (types.includes('shopping_mall') || types.includes('department_store')) return true;
  return false;
}

function getGatekeeperRisk(primaryType?: string): GatekeeperRisk {
  if (!primaryType) return 'UNKNOWN';
  if (HIGH_RISK_TYPES.includes(primaryType)) return 'HIGH';
  if (MEDIUM_RISK_TYPES.includes(primaryType)) return 'MEDIUM';
  if (LOW_RISK_TYPES.includes(primaryType)) return 'LOW';
  return 'UNKNOWN';
}

function getCategoryBucket(primaryType?: string): string {
  if (!primaryType) return 'Other';
  return CATEGORY_MAP[primaryType] ?? 'Other';
}

export function scoreLead(lead: Omit<CleanedLead, 'leadScore'>): number {
  let score = 0;
  if (!lead.hasWebsite) score += 40;
  if (lead.hasPhone) score += 25;
  if (lead.gatekeeperRisk === 'LOW') score += 15;
  if ((lead.userRatingCount ?? 0) >= 20) score += 10;
  else if ((lead.userRatingCount ?? 0) >= 5) score += 8;
  if ((lead.rating ?? 0) >= 4.3) score += 10;
  if (lead.gatekeeperRisk === 'HIGH') score -= 25;
  if (lead.gatekeeperRisk === 'MEDIUM') score -= 10;
  if (lead.isChainLikely) score -= 50;
  if (lead.businessStatus && lead.businessStatus !== 'OPERATIONAL') score -= 40;
  return Math.max(0, Math.min(100, score));
}

export function cleanPlace(place: NormalizedPlace): CleanedLead {
  const normalizedName = normalizeName(place.name);
  const hasWebsite = Boolean(place.websiteUri?.trim());
  const hasPhone = Boolean(place.nationalPhoneNumber?.trim());
  const types = place.types ?? [];
  const isChainLikely = detectChain(normalizedName, types);
  const gatekeeperRisk = getGatekeeperRisk(place.primaryType);
  const categoryBucket = getCategoryBucket(place.primaryType);
  const suburb = extractSuburb(place.formattedAddress);

  const reasons: string[] = [];
  let leadStatus: LeadStatus;

  if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') {
    leadStatus = 'DISCARDED';
    reasons.push('Business is not operational');
  } else if (isChainLikely) {
    leadStatus = 'DISCARDED';
    reasons.push('Likely chain/franchise');
  } else if (hasWebsite) {
    leadStatus = 'DISCARDED';
    reasons.push('Already has a website');
  } else if (hasPhone) {
    leadStatus = 'TODO';
    reasons.push('No website — phone available for direct call');
  } else {
    leadStatus = 'POTENTIAL_RESEARCH';
    reasons.push('No website or phone — needs manual research');
  }

  const partial: Omit<CleanedLead, 'leadScore'> = {
    googlePlaceId: place.placeId,
    name: place.name,
    normalizedName,
    primaryType: place.primaryType,
    types,
    categoryBucket,
    formattedAddress: place.formattedAddress,
    suburb,
    latitude: place.latitude,
    longitude: place.longitude,
    googleMapsUri: place.googleMapsUri,
    websiteUri: place.websiteUri,
    nationalPhoneNumber: place.nationalPhoneNumber,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    businessStatus: place.businessStatus,
    sourceQuery: place.sourceQuery,
    hasWebsite,
    hasPhone,
    isChainLikely,
    gatekeeperRisk,
    leadStatus,
    cleaningReasons: reasons,
  };

  return { ...partial, leadScore: scoreLead(partial) };
}
