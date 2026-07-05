# Preview Pack

## What it does

Each `BusinessLead` has a "Preview Pack" button on its dashboard card. Clicking it downloads a ZIP containing:

```
preview-pack-[business-name].zip
  business.json
  photos/
    photo-1.jpg
    photo-2.jpg
    photo-3.jpg
    photo-4.jpg
    photo-5.jpg
```

This is the raw material an operator hands off when building a preview website for a lead â€” structured business data plus real photos of the business, nothing else. The AI prompt used to actually generate the preview site is deliberately **not** included; it's pasted in manually, separately from this download.

## Why the ZIP never contains prompt/README/legal/generated code

The pack is scoped to *source material only*. If the prompt were bundled in, every download would carry the same boilerplate, and updating the prompt later would mean nothing (leads would still have the stale copy in their downloaded ZIPs, or worse, in case the ZIP is repurposed as a deliverable and shipped to a client with internal prompt text still inside). Keeping `business.json` + photos as the only contents means the ZIP is always safe to open, forward, or attach to a client email.

## Route: `POST /api/leads/[id]/preview-pack`

No request body. Behaviour:

1. Load `BusinessLead` by `id` via Prisma. **404** if not found.
2. **400** if `googlePlaceId` is missing (defensive â€” the column is `@unique` and non-null in the schema, but this guards against bad data or future schema changes).
3. Call Google Place Details **live** â€” this is not served from `BusinessLead` columns. See "Why fetch live" below.
4. Fetch up to 5 photos referenced in the Place Details response.
5. Build `business.json` and zip everything in memory with `JSZip`.
6. Return the ZIP as `application/zip` with a `Content-Disposition: attachment` header.

Implementation: `src/app/api/leads/[id]/preview-pack/route.ts`.

## Why fetch live instead of using stored `BusinessLead` columns

`BusinessLead` already has `name`, `formattedAddress`, `rating`, etc. â€” but it doesn't store **photos**, **opening hours**, or `internationalPhoneNumber`. Rather than adding those columns (which would mean re-importing every lead, and storing photo binaries or references that go stale), the route re-queries Google Places Details on demand using the stored `googlePlaceId` as the lookup key. This keeps the feature self-contained: no migration, no new `BusinessLead` fields, no background job to keep photos fresh. The tradeoff is a live API call (and its cost) every time an operator downloads a pack â€” acceptable, because packs are generated on demand, once per lead, right before outreach.

Note `docs/google-places.md`: `googlePlaceId` (`place_id`) is the one field Google explicitly allows storing indefinitely, which is exactly why it's usable as a durable lookup key here, long after the original import.

## Field mask

```
id,displayName,formattedAddress,location,primaryType,types,businessStatus,
googleMapsUri,nationalPhoneNumber,internationalPhoneNumber,websiteUri,
rating,userRatingCount,regularOpeningHours,photos,reviews
```


## Review testimonials

Reviews are included so the preview-site handoff can contain a small testimonial set. This field triggers the "Enterprise + Atmosphere" tier, so the route still avoids `*` (all fields) and only asks for the specific data the pack needs.

`testimonials` is derived from live Google reviews only. It keeps up to 4 reviews that have a rating of 4 stars or higher and non-empty review text. Each item includes the reviewer display name, reviewer profile/photo URI when Google returns them, the review rating, review text, publish timing, and Google Maps review URI.

## Photo fetching

- At most 5 photos are used, taken directly from the `photos` array in the Place Details response (already ordered by Google's relevance).
- Each photo's `name` (a resource path, not a URL) is used to call the Photos endpoint:
  ```
  GET https://places.googleapis.com/v1/{photoName}/media?maxWidthPx=1200&key=GOOGLE_PLACES_API_KEY
  ```
- **A failed photo fetch is skipped, not fatal.** The loop continues to the next photo and the ZIP is still produced. If zero photos succeed, the ZIP contains `business.json` only â€” there is no empty `photos/` folder and no error surfaced to the user for this case, since a business with no usable Google photos is common and not a failure state.
- File extension is inferred from the photo response's `Content-Type` header (`png`/`webp` detected, everything else defaults to `.jpg`) rather than assumed, since Google can return any of these formats depending on the source image.
- `business.json`'s `photos` array only lists photos that were actually written into the ZIP â€” if photo 3 of 5 fails, the array has 4 entries, not 5 with a gap.

## Why in-memory ZIP generation, no storage

`JSZip` builds the archive entirely in memory (`generateAsync({ type: 'arraybuffer' })`) and the route returns it directly in the HTTP response body. Nothing is written to disk, and no record of the download is persisted:

- **No stored ZIPs** â€” every download is generated fresh from live Google data, so there's no cache-invalidation problem and no disk cleanup job needed.
- **No stored photos** â€” photo bytes exist only for the duration of the request (fetched, written into the in-memory ZIP, response sent, then garbage collected). This avoids taking on Google's Places data-caching restrictions for image assets (see `docs/security.md`) â€” the tool never becomes a photo store.
- **No new database table.** The existing `BusinessLead.googlePlaceId` is the only piece of state this feature depends on. Adding a `PreviewPack` table to log downloads was considered and rejected as unnecessary for what is currently a manual, on-demand, single-operator action.

## Filename sanitisation

`preview-pack-[sanitized-business-name].zip`, where the business name (`displayName.text` from the live Place Details response, falling back to the stored lead name) is:

1. Lowercased and trimmed.
2. Spaces replaced with hyphens.
3. Anything that isn't a letter, digit, hyphen, or underscore stripped.
4. Truncated to 80 characters.
5. If the result is empty (no name, or a name that sanitises to nothing), the file is named `preview-pack-business.zip`.

This guarantees a filesystem-safe, ASCII-only filename that can go straight into a `Content-Disposition` header without needing to percent-encode it.

## `business.json` shape

```json
{
  "placeId": "string",
  "name": "string",
  "address": "string",
  "latitude": 0,
  "longitude": 0,
  "primaryType": "string",
  "types": [],
  "businessStatus": "string",
  "googleMapsUri": "string",
  "phone": "string",
  "website": "string",
  "rating": 0,
  "reviewCount": 0,
  "openingHours": [],
  "testimonials": [
    {
      "author": "string",
      "authorUri": "string",
      "authorPhotoUri": "string",
      "rating": 5,
      "text": "string",
      "relativePublishTimeDescription": "string",
      "publishTime": "ISO timestamp",
      "googleMapsUri": "string"
    }
  ],
  "photos": [
    { "filename": "photos/photo-1.jpg", "widthPx": 0, "heightPx": 0 }
  ],
  "fetchedAt": "ISO timestamp",
  "source": "Google Places API"
}
```

Every field falls back to the corresponding stored `BusinessLead` column if the live Place Details response omits it (e.g. a business that no longer has a phone listed on Google still returns the last-known `nationalPhoneNumber` from the database). `phone` prefers `nationalPhoneNumber`, falling back to `internationalPhoneNumber`.

## Frontend â€” `LeadCard.tsx`

The button lives in the existing links row (phone / website / maps / rating) on every dashboard lead card, right-aligned. No modal, no preview manager â€” a single button with a loading and error state local to that card:

1. `POST /api/leads/[id]/preview-pack`.
2. On success: read the filename from `Content-Disposition`, convert the response to a `Blob`, trigger a download via a temporary `<a download>` element and an object URL, then revoke the URL immediately after.
3. On failure: parse `{ error }` from the JSON body if present, and show it as a plain inline message under the links row â€” consistent with the existing inline error pattern used in `SearchApp.tsx` (no toast library in this project).

## Security

- `GOOGLE_PLACES_API_KEY` is read only inside this route handler, same as every other Places API call in the app â€” never sent to the browser.
- The only client-controlled input is the lead `id` in the URL path, used solely as a Prisma lookup key (parameterised â€” no injection risk).
- Errors from the Google API are logged server-side and returned to the browser as a generic message, not the raw Google error payload with account/billing details.

## Verified against real data

This route was tested against a live lead (a real `BusinessLead` row with a real `googlePlaceId`) using a real `GOOGLE_PLACES_API_KEY`, not just type-checked. The response was a valid ZIP containing `business.json` and 5 real JPEG photos (verified by magic bytes), and the 404 path was confirmed against a non-existent lead id.
