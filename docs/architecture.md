# Architecture

## Overview

LeadGen is a full-stack Next.js 14 application. The frontend handles search configuration and result display; the backend handles all API calls that carry secrets (Google Places key, database connection). There is no separate backend service — Next.js API routes serve as the server layer.

```
Browser
  └─ React client components (SearchApp, LeafletMap, ResultsTable, LeadsPage)
       └─ fetch() calls to Next.js API routes
            ├─ /api/places/nearby   → Google Places API (Nearby Search)
            ├─ /api/places/text     → Google Places API (Text Search)
            ├─ /api/leads/import    → Prisma Postgres (write)
            ├─ /api/leads           → Prisma Postgres (read)
            ├─ /api/leads/[id]/status    → Prisma Postgres (patch)
            └─ /api/leads/[id]/call-log → Prisma Postgres (patch + insert)
```

## Why Next.js 14 App Router

The App Router (introduced in Next.js 13, stable in 14) was chosen over the older Pages Router because:

- **Server Components by default.** Pages and layouts that don't need interactivity render on the server with zero client-side JavaScript, which is the right default for a tool used by a single operator.
- **Co-located API routes.** `src/app/api/*/route.ts` files live alongside the UI that calls them. No separate Express or Fastify server to maintain.
- **`'use client'` boundary is explicit.** Marking a component as a client component is a deliberate opt-in. This made it easy to ensure the Google Places API key and the database connection string never appeared in client bundles — they live only in server-side route handlers.

## Why TypeScript

TypeScript was chosen from the start because:

- The Prisma ORM generates TypeScript types directly from the schema. Every model, enum, and relation is fully typed. When you rename a field in `schema.prisma` and re-run `prisma generate`, every place in the codebase that used the old name becomes a compile error immediately.
- `NormalizedPlace` and the various request/response types in `src/types/places.ts` are shared between the API routes and the frontend. Without TypeScript, passing data between them is done on trust.
- The lead cleaner (`src/lib/lead-cleaner.ts`) uses discriminated logic across enum values. TypeScript ensures exhaustiveness — if a new `LeadStatus` is added to the schema, every `switch` statement that doesn't handle it produces a warning.

## Why Tailwind CSS

Tailwind was chosen over CSS Modules or a component library (MUI, Chakra, etc.) because:

- The design is custom and tight — specific dark slate sidebar, specific indigo accent, small text sizes that don't match library defaults. A utility-first approach lets you express exactly what you need without fighting component defaults.
- There is no design system to conform to. This is a single-operator internal tool, so velocity matters more than consistency with a shared library.
- Tailwind's purging keeps the production CSS bundle small. Only classes that appear in the code are emitted.

## Request lifecycle — importing a lead

This is the most complex flow in the app and a good example of how the layers work together:

1. User runs a search. The browser POSTs to `/api/places/nearby`, which calls Google Places API server-side and returns `NormalizedPlace[]`. The Google API key never leaves the server.
2. Results are stored in React state in `SearchApp.tsx`. Nothing is written to a database yet.
3. User clicks "Import to DB". The browser POSTs the in-memory `NormalizedPlace[]` to `/api/leads/import`.
4. The import route calls `importPlacesToDatabase()` from `src/lib/lead-importer.ts`. This function:
   a. Creates a `SearchRun` record.
   b. Loops over each place. For each one, calls `cleanPlace()` to compute `LeadStatus`, `leadScore`, `gatekeeperRisk`, etc.
   c. Upserts a `BusinessLead` — new records are inserted, existing ones get their metadata refreshed without changing their `leadStatus`.
   d. Creates an `ImportEvent` linking the lead to the run.
   e. Updates the `SearchRun` with final counts.
5. The route returns an `ImportSummary`. The browser displays it as a banner and marks imported rows with a "DB" badge.

## Directory structure

```
src/
  app/
    api/
      places/         ← Google Places proxy routes (no DB)
      leads/          ← Lead CRUD routes (Prisma Postgres)
    leads/            ← /leads page (tabbed CRM)
    page.tsx          ← / (search page)
  components/
    SearchApp.tsx     ← top-level client state container
    ControlPanel.tsx  ← dark sidebar form
    MapPanel.tsx      ← SSR-safe Leaflet wrapper
    LeafletMap.tsx    ← actual Leaflet rendering
    ResultsTable.tsx  ← sortable/filterable results table
    StatsBar.tsx      ← 4-metric summary bar
    LeadsPage.tsx     ← /leads tabbed CRM view
  lib/
    prisma.ts         ← PrismaClient singleton (PrismaPg adapter)
    lead-cleaner.ts   ← cleaning and scoring logic
    lead-importer.ts  ← DB write orchestration
    haversine.ts      ← client-side distance calculation
    csvExport.ts      ← CSV download trigger
  types/
    places.ts         ← shared types (NormalizedPlace, SearchMode, etc.)

prisma/
  schema.prisma       ← ORM schema (models, enums, indexes)
  migrations/         ← SQL migration history
  seed.ts             ← starter data for development

scripts/
  verify-prisma.ts    ← one-shot DB connectivity check

docs/                 ← this folder
```
