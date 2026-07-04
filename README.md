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
