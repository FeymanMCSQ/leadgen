# UI/UX Decisions

## Global navigation bar

A single `Navbar` component in `src/app/layout.tsx` appears on every page. It contains:
- Logo + "LeadGen" wordmark (left)
- Three navigation links: Search · Leads DB · Dashboard (highlighted green when active, using `usePathname`)

**Why global instead of per-page?** Previously each page had its own header. As the number of pages grew, navigation links had to be added to three separate files. A global navbar is the single source of truth — adding a new page requires one change in `Navbar.tsx` only.

**Why not a sidebar nav?** The search page already uses a full-height sidebar for controls. A top navbar doesn't compete with it and works consistently across all three pages which have different layouts.

## Page layouts

Each page fits inside the `flex-1` wrapper beneath the navbar:

### Search page (`/`)

```
┌────────────────────────────────────────────────────┐
│  Navbar (global, h-12)                             │
├────────────────────────────────────────────────────┤
│  Action bar (h-10) — hint text + Import to DB btn  │
├──────────────┬─────────────────────────────────────┤
│              │  StatsBar                           │
│  Dark        ├─────────────────────────────────────┤
│  Sidebar     │  Map (h-80, fixed height)           │
│  (w-72)      ├─────────────────────────────────────┤
│              │  Results table (flex-1, scrollable) │
└──────────────┴─────────────────────────────────────┘
```

**Why `overflow-hidden` at the root?** Prevents the page from scrolling as a whole. Only specific regions scroll — the sidebar category list and the results table. This keeps the map and controls always visible.

### Leads DB (`/leads`)

```
┌────────────────────────────────────────────────────┐
│  Navbar (global, h-12)                             │
├────────────────────────────────────────────────────┤
│  Sub-header (h-10) — "Lead Database" + count       │
├────────────────────────────────────────────────────┤
│  Status tab bar                                    │
├────────────────────────────────────────────────────┤
│  Table (flex-1, scrollable)                        │
└────────────────────────────────────────────────────┘
```

### Dashboard (`/dashboard`)

```
┌────────────────────────────────────────────────────┐
│  Navbar (global, h-12)                             │
├────────────────────────────────────────────────────┤
│  Scrollable content (max-w-3xl, centered)          │
│    ┌──────────────────────────────────────────┐    │
│    │  Daily Quota Card (progress bar)         │    │
│    ├──────────────────────────────────────────┤    │
│    │  Status tabs + Lead card list            │    │
│    └──────────────────────────────────────────┘    │
└────────────────────────────────────────────────────┘
```

The dashboard is the only page that scrolls vertically (it uses `overflow-auto` rather than `overflow-hidden`). Lead cards can stack to any length, so clamping to viewport height would make the list unusable.

## Dark sidebar, light content (search page)

The sidebar uses `bg-brand-navy` while the main area uses `bg-slate-50` / `bg-white`. This contrast communicates structure visually: the sidebar is the control panel, the main area is the output.

## Dashboard design

**Daily Quota Card.** Shows `completedToday / quota` with a green progress bar. When quota is met, a "✓ Quota complete" label appears next to the count. A Settings button in the card opens the quota modal.

**Why a progress bar instead of a number?** At a glance you can see how far through your day you are without reading numbers. The bar fills green — green = progress, empty = more to do.

**Status tabs.** Five tabs: To Do · Potential · In Progress · Approved · Declined. Each tab shows a live count badge. The badge turns green when that tab is active. Counts update when leads are moved between groups.

**Lead cards.** Each card shows:
- Business name + status badge
- Category and address excerpt
- Lead score (top right, subtle)
- Phone (tap-to-call link), website, maps links
- Quick action buttons (for TODO group only): In Progress, Approved, Declined, Move to Potential
- Notes textarea + status dropdown + Save button

**Why quick action buttons only on TODO?** The TODO tab is the primary working list — the inbox. Quick buttons let you triage leads with a single click without touching the dropdown. On other tabs, the dropdown is sufficient because you're not moving through a list rapidly.

**Lead removal on action.** When a lead's status changes and it no longer belongs to the current tab, it is removed from the list immediately (optimistic update). This keeps the list clean and confirms the action worked without a page reload.

## Color design (70-20-10)

The UI follows the 70-20-10 color principle derived from the logo:

| Role | Token | Hex | Usage |
|---|---|---|---|
| 70% background | white / `slate-50` | — | Page and card backgrounds |
| 20% structure | `brand-navy` | `#0D1B2A` | Sidebar, table headers |
| 10% accent | `brand-green` | `#34A853` | Active states, buttons, progress bar |
| Links | `brand-blue` | `#1A73E8` | Phone, website, maps links |

All tokens are defined in `tailwind.config.ts` under `theme.extend.colors.brand`.

## Segmented controls (search page)

The Nearby/Text mode toggle and Distance/Popularity rank toggle use a segmented control — both options visible at all times, the active one filled. This is faster to read and change than a `<select>` dropdown, which hides options until clicked.

## Category checkboxes (search sidebar)

43 categories organised into 8 labelled groups. Custom-styled using a hidden native `<input type="checkbox">` with a styled overlay div. The native input is `sr-only` so keyboard navigation and screen readers still work.

## Results table (search page)

- **Dark header, light rows.** `bg-brand-navy text-slate-300` header creates a strong visual anchor. Alternating row colours aid reading across wide rows. Hover uses `bg-brand-green-light`.
- **Sortable columns.** Name, Type, Rating, Distance. Sort indicator is faint by default, solid only for the active column. Hovering shows a faint indicator — discoverable without cluttering the header.
- **DB badge.** After import, rows show a small green "DB" badge. Transient — only for the current session's import. Purpose: immediate confirmation that the import worked.

## Leads DB page (`/leads`)

- **Tab-per-status.** Each `LeadStatus` value gets its own tab. TODO is the inbox; SUCCEEDED is closed deals.
- **Inline status dropdown.** Change a lead's status without opening a detail panel. For high-volume review of 50 TODO leads, inline editing is significantly faster than open-edit-save.
- **Notes save on blur.** No explicit save button — saves when focus leaves the field. Consistent with tools like Notion and Linear.
- **Default sort by score.** The table defaults to `ORDER BY leadScore DESC` — highest-priority leads appear first within each tab.

## Settings modal (dashboard)

A minimal modal with a single number input for daily quota (1–200). Accessed via the Settings button in the quota card. Validates client-side before sending to the server. Saves to `AppSettings` via `PATCH /api/settings`.
