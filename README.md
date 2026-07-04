# Local Lead Search — Phase 1: Search & Exploration

A web app to explore Google Places API results by area, category, and radius. Results appear on a Leaflet/OpenStreetMap map and a sortable table. Export to CSV when ready.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` in the project root:
   ```
   GOOGLE_PLACES_API_KEY=your_key_here
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Testing with Kensington NSW

The app loads with these defaults:

| Field | Value |
|---|---|
| Area | Kensington NSW |
| Latitude | -33.9173 |
| Longitude | 151.2313 |
| Radius | 1000 m |
| Category | barber_shop |
| Mode | Nearby Search |

Click **Run Search** — results appear on the map and in the table below.

## Security

`GOOGLE_PLACES_API_KEY` is only used inside backend API routes (`/api/places/nearby`, `/api/places/text`). It is never sent to or accessible from the browser.

The map uses OpenStreetMap tiles (no Google Maps JS API key required).

## Phase 1 scope only

This module covers search and exploration. Not included yet:
- Lead cleaning / enrichment pipeline
- CRM or contact storage
- Call dashboard
- Outreach tracker
- Grid search (multiple center points)

## Environment variables

| Variable | Description |
|---|---|
| `GOOGLE_PLACES_API_KEY` | Google Places API (New) — backend only |

---

## Phase 2 — Prisma Postgres + Lead Pipeline

Phase 2 adds a persistent lead database with automated cleaning, scoring, and a CRM-style pipeline view.

### New environment variables

Add these to `.env` (never commit real values):

| Variable | Description |
|---|---|
| `DATABASE_URL` | Prisma Postgres pooled connection URL |
| `DIRECT_URL` | Prisma Postgres direct connection URL |

### Database setup

1. Add `DATABASE_URL` and `DIRECT_URL` to `.env`
2. Generate the Prisma client:
   ```bash
   npm run prisma:generate
   ```
3. Run migrations (creates tables in your Postgres database):
   ```bash
   npm run prisma:migrate
   ```
4. (Optional) Open Prisma Studio to browse data:
   ```bash
   npm run prisma:studio
   ```

### New features

**Import to DB** — After running a search, click "Import to DB" in the header. Places are cleaned, scored, and saved. Duplicate place IDs are detected and skipped (only metadata like rating is refreshed). Imported rows get a violet "DB" badge in the results table.

**Lead pipeline** (`/leads`) — A tabbed CRM view sorted by lead score. Tabs: TODO, Research, Pending, Contacted, Dead End, Succeeded, Discarded, Do Not Call. Change status inline with the dropdown; add notes with the textarea (saves on blur).

**Lead cleaner** (`src/lib/lead-cleaner.ts`) — Assigns `LeadStatus`, `GatekeeperRisk`, `categoryBucket`, and `leadScore` (0-100) based on website/phone presence, chain detection, and business type.

**Call log** (`POST /api/leads/[id]/call-log`) — Records a call outcome and automatically advances the lead status (e.g. `CLOSED` → `SUCCEEDED`, `DO_NOT_CALL` → `DO_NOT_CALL`).

### API routes added

| Route | Method | Purpose |
|---|---|---|
| `/api/leads/import` | POST | Import NormalizedPlace array to database |
| `/api/leads` | GET | List leads with filters (status, category, score, etc.) |
| `/api/leads/[id]/status` | PATCH | Update lead status and/or notes |
| `/api/leads/[id]/call-log` | POST | Log a call outcome and advance pipeline status |
