# Architecture

## Overview

LeadGen is a full-stack Next.js 14 application. The frontend handles search, lead management, and the calling dashboard; the backend handles all API calls that carry secrets (Google Places key, database connection). There is no separate backend service — Next.js API routes serve as the server layer.

```
Browser
  └─ React client components (SearchApp, LeafletMap, ResultsTable, LeadsPage, DashboardApp, ...)
       └─ fetch() calls to Next.js API routes
            ├─ /api/places/nearby              → Google Places API (Nearby Search)
            ├─ /api/places/text                → Google Places API (Text Search)
            ├─ /api/leads/import               → Prisma Postgres (write)
            ├─ /api/leads                      → Prisma Postgres (read)
            ├─ /api/leads/[id]/status          → Prisma Postgres (patch)
            ├─ /api/leads/[id]/call-log        → Prisma Postgres (patch + insert)
            ├─ /api/dashboard/summary          → Prisma Postgres (read, quota calc)
            ├─ /api/dashboard/leads            → Prisma Postgres (read, grouped)
            ├─ /api/dashboard/leads/[id]       → Prisma Postgres (patch + quota record)
            ├─ /api/settings                   → Prisma Postgres (read)
            └─ /api/settings (PATCH)           → Prisma Postgres (write)
```

## Why Next.js 14 App Router

- **Server Components by default.** Pages and layouts that don't need interactivity render on the server with zero client-side JavaScript.
- **Co-located API routes.** `src/app/api/*/route.ts` files live alongside the UI that calls them. No separate Express or Fastify server.
- **`'use client'` boundary is explicit.** Marking a component as a client component is a deliberate opt-in. This ensures the Google Places API key and database connection string never appear in client bundles.

## Why TypeScript

- The Prisma ORM generates TypeScript types directly from the schema. When you rename a field in `schema.prisma`, every place in the codebase that used the old name becomes a compile error immediately.
- `NormalizedPlace` and request/response types in `src/types/places.ts` are shared between API routes and the frontend.
- The lead cleaner uses discriminated logic across enum values. TypeScript ensures exhaustiveness.

## Why Tailwind CSS

The design is custom and tight — specific dark navy sidebar, specific green accent, small text sizes that don't match library defaults. A utility-first approach expresses exactly what's needed without fighting component defaults. Brand colors are extended in `tailwind.config.ts` as `brand.*` tokens so they're reusable across components.

## Color design — 70-20-10

The UI follows the 70-20-10 color principle derived from the logo:

| Role | Color | Usage |
|---|---|---|
| 70% | White / `slate-50` | Page backgrounds, card surfaces |
| 20% | `brand-navy` (`#0D1B2A`) | Sidebar, table headers, structural elements |
| 10% | `brand-green` (`#34A853`) | Active tabs, buttons, progress bars, accents |

`brand-blue` (`#1A73E8`) is used for interactive links (phone, website, maps).

## Request lifecycle — importing a lead

1. User runs a search. The browser POSTs to `/api/places/nearby`, which calls Google Places API server-side. The API key never leaves the server.
2. Results are stored in React state in `SearchApp.tsx`. Nothing is written to the database yet.
3. User clicks "Import to DB". The browser POSTs the in-memory `NormalizedPlace[]` to `/api/leads/import`.
4. The import route calls `importPlacesToDatabase()`:
   - Creates a `SearchRun` record.
   - For each place, calls `cleanPlace()` to compute `LeadStatus`, `leadScore`, `gatekeeperRisk`, etc.
   - Upserts a `BusinessLead` — new records are inserted, existing ones get metadata refreshed without changing their `leadStatus`.
   - Creates an `ImportEvent`.
   - Updates the `SearchRun` with final counts.
5. Returns an `ImportSummary`. The browser displays it as a banner and marks imported rows with a "DB" badge.

## Request lifecycle — dashboard quota counting

1. User opens `/dashboard`. `DashboardApp` fetches `GET /api/dashboard/summary` to load quota progress and group counts.
2. User views the TODO tab. `LeadList` fetches `GET /api/dashboard/leads?group=todo`.
3. User clicks "In Progress" on a lead card. `LeadCard` sends `PATCH /api/dashboard/leads/[id]` with `{ leadStatus: "PENDING" }`.
4. The server:
   - Loads the existing lead (status: `TODO`).
   - Detects a `TODO → PENDING` transition.
   - Checks `LeadStatusChange` for an existing counted record for this lead today.
   - Creates a `LeadStatusChange` with `countedForDailyQuota: true`.
   - Updates the lead's status.
   - Returns `{ lead, quotaCounted: true }`.
5. `LeadCard` removes the lead from the current tab's list. `DashboardApp` re-fetches the summary to update the progress bar.

## Global navigation

A single `Navbar` component is mounted in `src/app/layout.tsx` and appears on every page. Each page's root container uses `h-full` (not `h-screen`) and fits within the `flex-1` wrapper below the navbar. This means there is one source of truth for navigation — adding a new page requires only one change in `Navbar.tsx`.

## Directory structure

```
src/
  app/
    api/
      places/               ← Google Places proxy routes (no DB)
      leads/                ← Lead CRUD + import routes
      dashboard/
        summary/            ← Quota progress + group counts
        leads/              ← Grouped lead fetch
        leads/[id]/         ← Status patch + quota recording
      settings/             ← AppSettings GET + PATCH
    dashboard/              ← /dashboard page
    leads/                  ← /leads page
    layout.tsx              ← Global layout: Navbar + children wrapper
    page.tsx                ← / (search page)
  components/
    Navbar.tsx              ← Global nav bar (active tab highlight)
    SearchApp.tsx           ← Search page state container
    ControlPanel.tsx        ← Dark sidebar form
    MapPanel.tsx            ← SSR-safe Leaflet wrapper
    LeafletMap.tsx          ← Leaflet rendering
    ResultsTable.tsx        ← Sortable/filterable results table
    StatsBar.tsx            ← 4-metric summary bar
    LeadsPage.tsx           ← /leads tabbed CRM view
    dashboard/
      DashboardApp.tsx      ← Dashboard root client component
      DailyQuotaCard.tsx    ← Progress bar + quota display
      StatusTabs.tsx        ← Group tab bar with live counts
      LeadList.tsx          ← Fetches + renders lead cards for a group
      LeadCard.tsx          ← Individual lead with quick actions + notes
      StatusBadge.tsx       ← Coloured pill for lead group
      SettingsModal.tsx     ← Quota editor modal
      types.ts              ← Shared dashboard types + constants
  lib/
    prisma.ts               ← PrismaClient singleton (PrismaPg adapter)
    lead-cleaner.ts         ← Cleaning and scoring logic
    lead-importer.ts        ← DB write orchestration
    dashboard-groups.ts     ← Group ↔ status bidirectional mapping
    timezone.ts             ← getLocalDate() using Intl.DateTimeFormat
    haversine.ts            ← Client-side distance calculation
    csvExport.ts            ← CSV download trigger
  types/
    places.ts               ← Shared types (NormalizedPlace, SearchMode, etc.)

prisma/
  schema.prisma             ← ORM schema (models, enums, indexes)
  migrations/               ← SQL migration history
  seed.ts                   ← Starter data for development
  config.ts                 ← Prisma 7 config (URL, migration path, seed)

docs/                       ← Architecture and decision records
```
