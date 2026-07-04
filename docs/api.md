# API Routes

All routes live under `src/app/api/`. They are Next.js Route Handlers (App Router) — each exports named functions (`GET`, `POST`, `PATCH`) corresponding to HTTP methods.

## Places routes (no database)

These routes exist purely to proxy Google Places API calls server-side, keeping the API key out of the browser.

---

### `POST /api/places/nearby`

Calls `https://places.googleapis.com/v1/places:searchNearby`.

**Request body:**
```json
{
  "includedTypes": ["barber_shop", "hair_salon"],
  "center": { "latitude": -33.9173, "longitude": 151.2313 },
  "radius": 1000,
  "maxResultCount": 20,
  "rankPreference": "DISTANCE"
}
```

**Response:**
```json
{
  "places": [NormalizedPlace, ...],
  "rawCount": 8
}
```

`rawCount` is the number of results Google returned before any deduplication. The frontend uses it for the StatsBar.

**Why a POST instead of GET?** The search parameters (coordinates, radius, type list) are sent as a JSON body. While technically these could be query parameters, a JSON body is easier to validate and extend. The Places API itself uses POST for search requests; mirroring that makes the proxy layer thin.

---

### `POST /api/places/text`

Calls `https://places.googleapis.com/v1/places:searchText`.

**Request body:**
```json
{
  "textQuery": "barbers in Kensington NSW",
  "maxResultCount": 20
}
```

**Response:** Same shape as `/nearby` — `{ places, rawCount }`.

---

## Lead routes (Prisma Postgres)

These routes read from and write to the database. They all use the `prisma` singleton from `src/lib/prisma.ts`.

---

### `POST /api/leads/import`

Receives a `NormalizedPlace[]` array and runs the full cleaning + import pipeline.

**Request body:**
```json
{
  "places": [NormalizedPlace, ...],
  "source": "GOOGLE_NEARBY",
  "mode": "nearby",
  "areaLabel": "Kensington NSW",
  "centerLat": -33.9173,
  "centerLng": 151.2313,
  "radiusMeters": 1000,
  "includedTypes": ["barber_shop"]
}
```

**Response (`ImportSummary`):**
```json
{
  "searchRunId": "cm...",
  "rawResultsCount": 12,
  "newLeadsCount": 10,
  "existingLeadsCount": 2,
  "todoCount": 5,
  "potentialCount": 3,
  "discardedCount": 2,
  "imported": [
    { "googlePlaceId": "ChIJ...", "name": "...", "wasNew": true, "finalStatus": "TODO", "leadScore": 80 }
  ]
}
```

**Design decisions:**
- The route validates that `places` is an array and `source` is one of the two valid enum values. It does not validate individual `NormalizedPlace` fields — those come from the Places API proxy, which is trusted.
- The actual work is delegated to `importPlacesToDatabase()`. The route handler only handles HTTP concerns (parsing, validation, error response format).
- Errors from the database are caught, logged server-side, and returned as `{ error: "Import failed" }` with a 500 status. The actual error is never sent to the browser (it may contain connection string fragments or SQL).

---

### `GET /api/leads`

Returns a paginated, filtered list of leads.

**Query parameters:**
| Parameter | Type | Description |
|---|---|---|
| `status` | LeadStatus | Filter by lead status |
| `categoryBucket` | string | Filter by category (e.g. "Beauty") |
| `primaryType` | string | Filter by Google type |
| `hasWebsite` | boolean | "true" or "false" |
| `hasPhone` | boolean | "true" or "false" |
| `minScore` | number | Minimum lead score |
| `limit` | number | Max results (capped at 500) |
| `offset` | number | Pagination offset |
| `sort` | string | Sort column: `leadScore`, `createdAt`, `updatedAt`, `name` |
| `order` | string | `asc` or `desc` |

**Response:**
```json
{
  "leads": [BusinessLead, ...],
  "total": 47
}
```

The `total` reflects the count matching the filters (not just the current page), so the frontend can show "47 leads" even when displaying only 200 at a time.

**Why cap limit at 500?** Returning thousands of leads in a single response could cause browser memory issues when rendered into a table. 500 is a practical upper bound for a single-operator tool.

---

### `PATCH /api/leads/[id]/status`

Updates a lead's status and optionally its notes.

**Request body:**
```json
{
  "leadStatus": "CONTACTED",
  "notes": "Spoke with owner, interested"
}
```

**Response:** The updated `BusinessLead` record.

**Why PATCH instead of PUT?** PATCH is semantically correct for partial updates. The route only changes `leadStatus` and optionally `notes` — it does not require or accept the full lead record. PUT implies replacing the entire resource.

---

### `POST /api/leads/[id]/call-log`

Records a call attempt and automatically advances the lead's status based on the outcome.

**Request body:**
```json
{
  "outcome": "SENT_LINK",
  "notes": "Spoke with owner, sent link to portfolio",
  "nextFollowUpAt": "2026-07-11T09:00:00.000Z"
}
```

**Response:**
```json
{
  "callLog": { "id": "...", "outcome": "SENT_LINK", ... },
  "updatedLead": { "id": "...", "leadStatus": "PENDING", ... }
}
```

The call log creation and status update are wrapped in a `prisma.$transaction()` — both succeed or both fail together. This prevents a state where the call is logged but the status wasn't updated (or vice versa).

**Outcome-to-status mapping:** See [lead-pipeline.md](./lead-pipeline.md) for the full mapping table.

## Error handling conventions

All routes follow the same error response format:
```json
{ "error": "Human-readable message" }
```

- `400` — bad request (missing required field, invalid enum value, malformed JSON)
- `500` — database error or unexpected failure (full error logged server-side only)
- `404` — not implemented yet (Prisma's `findUnique` returning null would return a 404 in a future version of the status and call-log routes)

## Input validation approach

The routes validate only the fields that, if wrong, would cause a database error or incorrect behavior:
- `places` must be an array (otherwise the loop in `importPlacesToDatabase` would throw).
- `source` must be a valid enum value (otherwise the Prisma insert would throw a validation error).
- `leadStatus` must be a valid enum value (otherwise the PATCH would write an invalid value).
- `outcome` must be a valid enum value (otherwise the call-log insert would fail and the outcome-to-status mapping would return `undefined`).

Fields like individual `NormalizedPlace` properties are not validated because they come from trusted internal sources (the Places API proxy routes, which are not public-facing inputs).
