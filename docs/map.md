# Map

## Why Leaflet instead of Google Maps JavaScript API

The map uses Leaflet with OpenStreetMap tiles, not the Google Maps JavaScript API. The reasons:

**No separate JS API key.** The Google Places API key is a server-side credential. The Google Maps JavaScript API requires a *separate* key that is intended to be embedded in the browser. Embedding that key in the frontend would expose a billing credential to anyone who views the page source, which is exactly the security problem the backend-proxy approach is designed to avoid.

**Cost.** The Google Maps JavaScript API charges for map loads. OpenStreetMap tiles are free for reasonable usage (subject to the OpenStreetMap Foundation's usage policy). For a single-operator internal tool, the usage is well within the free tier.

**Sufficient capability.** The map in this tool does three things: center on a location, draw a circle showing the search radius, and place markers for each result. Leaflet handles all three with less than 50 lines of code. The Google Maps JS API's additional capabilities (Street View, traffic layers, styled maps) are not needed.

## The SSR problem with Leaflet

Leaflet is a browser library. It uses `window`, `document`, and browser-specific APIs internally. Next.js App Router renders components on the server by default. If you import Leaflet in a server-rendered component, it throws:

```
ReferenceError: window is not defined
```

### The fix: dynamic import with `ssr: false`

`src/components/MapPanel.tsx` imports the Leaflet component using Next.js's `dynamic()` function:

```typescript
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="...">Loading map...</div>,
});
```

Setting `ssr: false` tells Next.js to skip this component during server-side rendering entirely. It is only rendered in the browser. The `loading` prop provides a placeholder that shows during the initial hydration delay.

`LeafletMap.tsx` is marked `'use client'` but that alone is not enough — `'use client'` means "this component runs in the browser", but Next.js still attempts to pre-render it on the server for the initial HTML. Only `ssr: false` completely bypasses server rendering for a component.

**Why a separate `MapPanel.tsx` wrapper?** Because `dynamic()` must be called at the module level (not inside a render function), and the wrapper keeps the map configuration (Leaflet imports, CSS import) entirely in `LeafletMap.tsx` while `MapPanel.tsx` handles the dynamic import boundary. This separation makes it clear where the SSR boundary is.

## The marker icon problem

Leaflet's default marker icons are loaded from a relative path that assumes the icons are in the same directory as the Leaflet CSS file. In a Webpack/Next.js build, Leaflet's CSS is processed and the icon paths are broken because the icon PNG files are not copied to the expected location.

The standard fix in many guides is to reassign `Leaflet.Icon.Default.prototype._getIconUrl` to `undefined` and then set `mergeOptions` with the correct asset paths. This works if the icon files are imported explicitly, but webpack still needs to be told about them.

The simpler fix used here: **CDN URLs for marker icons.** The `LeafletMap.tsx` component uses `L.icon()` with URLs pointing directly to the Leaflet CDN:

```typescript
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
```

This sidesteps webpack entirely. The icon images are served from the same CDN that delivers the Leaflet JS package, so the URLs are stable and versioned. The minor tradeoff is that users need an internet connection for icons to appear — acceptable for a tool that already requires an internet connection for Google Places API calls.

## Map features

**Center marker.** A red `DivIcon` (a custom HTML div rendered as a map marker) marks the search center. Using a `DivIcon` instead of a standard marker means no dependency on the external marker PNG for the center point — it's a plain red circle rendered with CSS.

**Radius circle.** A `Circle` component from `react-leaflet` draws the search area. It uses the same `radius` value (in metres) that is sent to the Nearby Search API, so the circle on the map exactly represents the area that was searched.

**Result markers.** Each result in `NormalizedPlace[]` gets a standard Leaflet marker. Clicking a marker opens a `Popup` with the business name, formatted address, phone number, and website link.

**`RecenterMap` sub-component.** When the user changes the coordinates and runs a new search, the map needs to pan and zoom to the new center. This is done by a small `RecenterMap` component inside `LeafletMap.tsx` that uses `useMap()` from `react-leaflet` to get the map instance and calls `map.setView()` in a `useEffect` whenever the `center` prop changes. This pattern is necessary because `react-leaflet` components don't expose the raw Leaflet map instance to their parents — you must use `useMap()` inside a child of `MapContainer`.
