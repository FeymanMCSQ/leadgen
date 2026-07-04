# LeadGen

A local-business lead-generation tool for web dev agencies. Search Google Places, clean and score results, manage a calling pipeline, and track daily call quotas — all in one internal tool.

## What it does

1. **Search** — query Google Places by area, business type, and radius. Results appear on an interactive map and a sortable table.
2. **Import** — one click sends results through a cleaning pipeline that auto-classifies each business as a callable lead, a research lead, or discarded.
3. **Leads DB** — a CRM-style tabbed view of every lead in the database. Update status, add notes, change pipeline stage inline.
4. **Dashboard** — a daily calling accountability page. Set a call quota, action leads from a grouped view, and watch a progress bar fill as you work through your list.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` in the project root:
   ```
   GOOGLE_PLACES_API_KEY=your_key_here
   DATABASE_URL=your_prisma_postgres_url
   APP_TIMEZONE=Australia/Sydney
   ```

3. Apply the database schema:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | Yes | Google Places API (New) — backend only, never sent to browser |
| `DATABASE_URL` | Yes | Prisma Postgres pooled connection URL |
| `APP_TIMEZONE` | No | Timezone for daily quota resets (default: `Australia/Sydney`) |

## Pages

| Route | Purpose |
|---|---|
| `/` | Search Google Places, view results on map and table, import to DB |
| `/leads` | Full lead database — filter by status, edit inline |
| `/dashboard` | Daily calling tracker — quota progress, grouped lead cards |

## Lead classification

When you import results, each business is automatically classified:

| Classification | Rule | What it means |
|---|---|---|
| **TODO** | No website + has phone | Best leads — call them directly |
| **Potential** | No website + no phone | Research first to find contact info |
| **Discarded** | Has website, or is a chain, or not operational | Not a prospect for a web dev agency |

The logic: you are selling websites. If a business already has one, they are not your prospect. If they have no website but a phone number, they are ready to call. If they have neither, research is needed first.

## Dashboard — daily quota

The dashboard tracks how many leads you have actioned per day. A lead counts toward your quota when it moves from **TODO** to any other status (once per lead, per calendar day, in your configured timezone).

Set your daily quota in Settings (defaults to 5). The progress bar resets at midnight in your timezone.

## Status groups

The dashboard groups statuses into five tabs:

| Tab | Statuses |
|---|---|
| To Do | TODO |
| Potential | POTENTIAL_RESEARCH |
| In Progress | PENDING, CONTACTED |
| Approved | SUCCEEDED |
| Declined | DEAD_END, DISCARDED, DO_NOT_CALL |

## Security

- `GOOGLE_PLACES_API_KEY` is used only in backend API routes — never exposed to the browser.
- `DATABASE_URL` is used only in the Prisma client singleton — never sent to the client.
- All API keys and connection strings live in `.env` which is git-ignored.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| ORM | Prisma 7.8.0 |
| Database | Prisma Postgres (pooled) |
| Map | Leaflet + react-leaflet |
| DB adapter | @prisma/adapter-pg |

## Documentation

Detailed architecture and decision records are in the `docs/` folder:

| File | Contents |
|---|---|
| `architecture.md` | System overview, directory structure, request lifecycle |
| `database.md` | Schema design, Prisma setup, connection pooling |
| `lead-pipeline.md` | How leads are cleaned, scored, and classified |
| `api.md` | All API routes — request/response shapes, design decisions |
| `ui-ux.md` | Layout decisions, component design rationale |
| `google-places.md` | Google Places API integration details |
| `map.md` | Leaflet setup and ESM bundling fix |
| `security.md` | Key handling, environment variable strategy |
| `deployment.md` | Production deployment notes |
