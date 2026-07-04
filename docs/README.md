# LeadGen — Documentation Index

This folder contains architecture and decision records for the LeadGen application. Each file covers a distinct concern. Read them in the order below for a full picture, or jump to whichever topic you need.

| File | What it covers |
|---|---|
| [architecture.md](./architecture.md) | System overview, tech stack choices, request lifecycle |
| [database.md](./database.md) | Prisma ORM, Prisma Postgres, schema design, migration strategy |
| [lead-pipeline.md](./lead-pipeline.md) | Lead cleaning, scoring, status state machine, chain detection |
| [google-places.md](./google-places.md) | Places API integration, field masks, deduplication, distance |
| [map.md](./map.md) | Leaflet/OpenStreetMap choice, SSR issue and fix, icon workaround |
| [api.md](./api.md) | All API routes, their inputs, outputs, and design rationale |
| [ui-ux.md](./ui-ux.md) | Layout, sidebar, categories, visual design decisions |
| [security.md](./security.md) | API key handling, env management, Google data policy |
| [deployment.md](./deployment.md) | Prisma Compute setup, region, environment injection |

## Quick orientation

The app is split into two phases:

**Phase 1 — Search & Exploration**
A web UI that lets you search Google Places by area, category, and radius. Results appear on a live map and a sortable/filterable table. You can accumulate results across multiple searches (deduplication keeps the list clean) and export to CSV.

**Phase 2 — Lead Database & Pipeline**
An "Import to DB" button sends the in-memory results through a cleaning and scoring pipeline, then saves them to a hosted Prisma Postgres database. A separate `/leads` route provides a tabbed CRM view where you can change lead status, add notes, and track progress.
