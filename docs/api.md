# API Routes

All routes live under `src/app/api/`. They are Next.js Route Handlers (App Router) — each exports named functions (`GET`, `POST`, `PATCH`) corresponding to HTTP methods.

## Places routes (no database)

These routes proxy Google Places API calls server-side, keeping the API key out of the browser.

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
  "discardedCount": 4,
  "imported": [
    { "googlePlaceId": "ChIJ...", "name": "...", "wasNew": true, "finalStatus": "TODO", "leadScore": 80 }
  ]
}
```

---

### `GET /api/leads`

Returns a paginated, filtered list of leads.

**Query parameters:**
| Parameter | Type | Description |
|---|---|---|
| `status` | LeadStatus | Filter by lead status |
| `categoryBucket` | string | Filter by category (e.g. "Beauty") |
| `hasWebsite` | boolean | "true" or "false" |
| `hasPhone` | boolean | "true" or "false" |
| `minScore` | number | Minimum lead score |
| `limit` | number | Max results (capped at 500) |
| `offset` | number | Pagination offset |
| `sort` | string | `leadScore`, `createdAt`, `updatedAt`, `name` |
| `order` | string | `asc` or `desc` |

**Response:**
```json
{ "leads": [BusinessLead, ...], "total": 47 }
```

---

### `PATCH /api/leads/[id]/status`

Updates a lead's status and optionally its notes.

**Request body:**
```json
{ "leadStatus": "CONTACTED", "notes": "Spoke with owner, interested" }
```

**Response:** The updated `BusinessLead` record.

---

### `POST /api/leads/[id]/call-log`

Records a call attempt and automatically advances the lead's status.

**Request body:**
```json
{
  "outcome": "SENT_LINK",
  "notes": "Sent portfolio link",
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

---

## Dashboard routes

---

### `GET /api/dashboard/summary`

Returns quota progress and per-group lead counts for the dashboard header card.

**Response:**
```json
{
  "quota": 5,
  "completedToday": 2,
  "remainingToday": 3,
  "timezone": "Australia/Sydney",
  "localDate": "2026-07-04",
  "countsByGroup": {
    "todo": 12,
    "potential": 4,
    "inProgress": 3,
    "approved": 1,
    "declined": 8
  }
}
```

`completedToday` counts `LeadStatusChange` records where `countedForDailyQuota = true` and `localDate` equals today in the configured timezone. See [lead-pipeline.md](./lead-pipeline.md) for the quota counting rules.

---

### `GET /api/dashboard/leads`

Returns leads filtered by dashboard group.

**Query parameters:**
| Parameter | Type | Description |
|---|---|---|
| `group` | string | One of: `todo`, `potential`, `inProgress`, `approved`, `declined` |
| `limit` | number | Max results (capped at 500, default 100) |
| `offset` | number | Pagination offset |

**Group-to-status mapping:**

| Group | Statuses included |
|---|---|
| `todo` | TODO |
| `potential` | POTENTIAL_RESEARCH |
| `inProgress` | PENDING, CONTACTED |
| `approved` | SUCCEEDED |
| `declined` | DEAD_END, DISCARDED, DO_NOT_CALL |

**Response:**
```json
{ "leads": [BusinessLead, ...], "total": 12 }
```

Leads are ordered by `leadScore DESC` so the highest-priority ones appear first.

---

### `PATCH /api/dashboard/leads/[id]`

Updates a lead's status and/or notes from the dashboard. Handles quota counting.

**Request body:**
```json
{ "leadStatus": "PENDING", "notes": "Called, interested" }
```

**Response:**
```json
{
  "lead": { "id": "...", "leadStatus": "PENDING", ... },
  "quotaCounted": true
}
```

`quotaCounted` is `true` when the transition was from `TODO` to a non-TODO status AND the lead had not already been counted today. The frontend uses this to trigger a summary refresh.

**Quota logic (server-side):**
1. Load the existing lead.
2. If status is changing from `TODO` to non-`TODO`, check `LeadStatusChange` for an existing counted record for this lead on today's local date.
3. If none exists, create the `LeadStatusChange` record with `countedForDailyQuota = true`.
4. Update the lead's status and/or notes.

---

## Settings routes

---

### `GET /api/settings`

Returns the current app settings. Creates a default record if none exists.

**Response:**
```json
{
  "id": "default",
  "dailyCallQuota": 5,
  "timezone": "Australia/Sydney",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### `PATCH /api/settings`

Updates one or both settings fields.

**Request body:**
```json
{ "dailyCallQuota": 10, "timezone": "America/New_York" }
```

**Validation:**
- `dailyCallQuota` must be an integer between 1 and 200.
- `timezone` must be a non-empty string.

**Response:** The updated `AppSettings` record.

---

## Error handling conventions

All routes return errors in the same format:
```json
{ "error": "Human-readable message" }
```

- `400` — bad request (missing field, invalid enum value, validation failure)
- `404` — lead not found
- `500` — database error (full error logged server-side only, never sent to browser)
