# Google Places API Integration

## Which API version is used

This project uses the **Google Places API (New)** — specifically the `places.googleapis.com/v1/` endpoints, not the older `maps.googleapis.com/maps/api/place/` endpoints.

The new API was chosen because:
- It is Google's actively-maintained version. The old API is in maintenance mode.
- It returns richer data in a more structured format.
- It supports field masks via the `X-Goog-FieldMask` header, which lets you pay only for the fields you actually use. The old API charges at the level of Basic/Contact/Atmosphere data categories, with no field-level control.

## Two search modes

### Nearby Search (`places:searchNearby`)

Searches within a radius around a geographic point. Configured with:
- `includedTypes` — one or more Google place types (e.g. `barber_shop`, `hair_salon`)
- `locationRestriction.circle` — center coordinates + radius in metres
- `maxResultCount` — 1 to 20 (Google's hard limit per request)
- `rankPreference` — `DISTANCE` (nearest first) or `POPULARITY` (most-reviewed first)

**When to use:** You know the geographic area and want to find all businesses of a certain type within a radius. Good for grid-style coverage of a suburb.

### Text Search (`places:searchText`)

Free-text search, similar to what you'd type into Google Maps. Configured with:
- `textQuery` — e.g. "barbers in Kensington NSW"
- `maxResultCount` — 1 to 20
- `rankPreference` — `DISTANCE` or `RELEVANCE`

**When to use:** You want to mirror what a potential customer would search. Useful for catching businesses whose Google type doesn't exactly match your category filter (e.g. a "beauty therapist" that isn't tagged as `beauty_salon`).

## Field mask

Every request to the Places API includes an `X-Goog-FieldMask` header listing the exact fields to return:

```
places.id,places.displayName,places.formattedAddress,places.location,
places.primaryType,places.types,places.businessStatus,places.googleMapsUri,
places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount
```

**Why this matters financially:** The Places API (New) charges per field category:
- `id` and `displayName` are in the "Basic" tier (cheapest).
- `formattedAddress`, `location`, `businessStatus` are "Basic".
- `nationalPhoneNumber`, `websiteUri` are "Contact" tier (more expensive).
- `rating`, `userRatingCount` are "Atmosphere" tier (most expensive).

Without the field mask, Google returns all available data at the highest applicable tier price for every result. With the field mask, you pay only for what you request. For a lead-gen tool making many searches, this is meaningful.

## Why the API key is backend-only

The `GOOGLE_PLACES_API_KEY` environment variable is read only inside `src/app/api/places/nearby/route.ts` and `src/app/api/places/text/route.ts`. It is never imported or referenced in any client component.

**The risk of a browser-exposed key:** A Google Places API key with unrestricted access is a billing credential. If it appears in the browser (in a network request, in JavaScript source, or in a build artifact), anyone who visits the page can extract it and use it to make API calls billed to your account. Google allows you to restrict API keys by HTTP referrer or IP, but:
- Referrer restrictions can be bypassed with a trivial header change.
- IP restrictions require you to know the IP of every user's browser, which is impossible.

By proxying all Places API calls through Next.js API routes, the key stays on the server. The browser only ever talks to `/api/places/nearby` — your own endpoint.

## Response normalisation

Both route handlers normalise the raw Google response into `NormalizedPlace[]` before sending it to the browser. This serves two purposes:

1. **Decoupling.** The frontend types (`NormalizedPlace` in `src/types/places.ts`) don't depend on Google's API response format. If Google changes a field name (as they have before), you fix it in one route handler, not across every component.

2. **Simplification.** Google returns `displayName.text` (a nested object) for the business name. `NormalizedPlace` flattens this to `name: string`. Components don't have to navigate nested Google response structures.

## Deduplication

When search results come back from the API, they are merged into the existing in-memory result set in `SearchApp.tsx`. Deduplication is done by `placeId` (Google's `places.id`):

```typescript
const existingIds = new Set(prev.map((p) => p.placeId));
const newOnes = incoming.filter((p) => !existingIds.has(p.placeId));
```

This means you can run multiple searches across different categories or radii and accumulate results in the table without duplicates. The StatsBar shows how many were new vs duplicates in the most recent search.

**Why deduplicate by `place_id`?** Google's `place_id` is a stable, globally unique identifier for each business. The same business will have the same `place_id` whether it appears in a Nearby Search for `barber_shop` or a Text Search for "barbers near Kensington". Deduplicating by name would fail for businesses with generic names.

## `place_id` and Google's data policy

Google's Places API Terms of Service prohibit storing most Places data beyond a short caching period. The exception is `place_id` itself, which Google explicitly allows you to store indefinitely.

This is why `googlePlaceId` is the primary key of the `BusinessLead` model and the deduplication key for imports. Other fields like `websiteUri`, `nationalPhoneNumber`, and `rating` are stored at import time because:
- The Terms allow caching for the purpose of displaying the data to the end user (the tool's operator).
- The data is not shared with third parties.
- Ratings and phone numbers are refreshed on re-import rather than treated as permanent records.

## Distance calculation

The Places API Nearby Search does not always return a distance in the response (it depends on the `rankPreference`). To show consistent distance data in the results table, distance is recalculated client-side using the Haversine formula in `src/lib/haversine.ts`.

Haversine calculates the great-circle distance between two lat/lng points — the straight-line distance across the Earth's surface. This is not driving distance, but it's accurate enough for the tool's purpose (showing approximate proximity to your search center).

The formula is applied in `SearchApp.tsx` during result normalisation:
```typescript
distanceMeters: haversineDistance(lat, lng, p.latitude, p.longitude)
```

The result is stored on each `NormalizedPlace` object and displayed in the "Dist (m)" column of the results table.

## 43 supported categories

The sidebar's category picker is grouped into 8 sections, covering 43 Google place types selected for their relevance to the target market (local service businesses likely to lack a professional web presence):

- **Beauty & Wellness** (12 types) — barber shops, salons, spas, skin care, tanning
- **Automotive** (4 types) — car repair, car wash, tyre shops, parts stores
- **Home & Local Services** (7 types) — laundry, tailors, florists, locksmiths, movers, storage, couriers
- **Trades** (4 types) — electricians, plumbers, painters, roofers
- **Pets** (4 types) — pet stores, groomers, boarding, vets
- **Food & Drink** (6 types) — bakeries, cafés, coffee shops, restaurants, caterers
- **Fitness** (4 types) — gyms, fitness centres, sports coaching, sports schools
- **Health & Professional** (4 types) — dentists, physios, lawyers, accountants

These were chosen because owner-operated businesses in these categories are common, typically small enough to not have in-house web development resources, and responsive to cold outreach for website services.
