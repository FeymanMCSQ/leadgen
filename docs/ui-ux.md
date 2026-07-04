# UI/UX Decisions

## Overall layout

The app uses a fixed two-column layout that fills the full viewport height:

```
┌──────────────────────────────────────────────────────────┐
│  Header bar (h-12)                                       │
├──────────────┬───────────────────────────────────────────┤
│              │  StatsBar                                 │
│  Dark        ├───────────────────────────────────────────┤
│  Sidebar     │  Map (h-80, fixed height)                 │
│  (w-72)      ├───────────────────────────────────────────┤
│              │  Results table (flex-1, scrollable)       │
└──────────────┴───────────────────────────────────────────┘
```

**Why `h-screen` with `overflow-hidden` at the root?** This prevents the page from scrolling as a whole. Instead, only specific regions scroll — the sidebar category list and the results table. This keeps the map and the search controls always visible without the user having to scroll back to them.

**Why a fixed sidebar width (`w-72`) instead of a resizable panel?** The sidebar contains a fixed set of controls. The content doesn't grow horizontally, so a fixed width is correct. Resizable panels add complexity (drag handles, state persistence) that isn't warranted for a single-operator tool.

## Dark sidebar, light content

The sidebar uses `bg-slate-900` (dark) while the main content area uses `bg-slate-50` / `bg-white` (light). This contrast serves a functional purpose:

- **Visual separation.** The sidebar is the control panel; the main area is the output. Dark/light contrast immediately communicates this without any explicit labelling.
- **Reduces eye strain during long sessions.** The sidebar with its many checkboxes and inputs is not scanned constantly — it's configured once per search. A dark background reduces the visual prominence of a region that isn't the focus of attention most of the time.
- **Indigo accent works in both modes.** Indigo (`#4F46E5`) is bright enough to be legible on dark slate and provides enough contrast on light backgrounds. Using a single accent colour across both regions creates visual coherence.

## Segmented controls for mode and rank

The Nearby/Text mode toggle and the Distance/Popularity rank toggle use a segmented control (two buttons side-by-side, the active one filled with indigo):

```
[● Nearby Search] [  Text Search  ]
```

**Why not a `<select>` dropdown?** A dropdown hides the available options until clicked. A segmented control shows both options at all times, making it immediately obvious what states are available and which is active. For binary or three-way choices, a segmented control is faster to read and faster to change.

## Category checkboxes

The 43 categories are organised into 8 labelled groups in the sidebar. Each group has:
- A section heading in `text-[10px] uppercase tracking-widest text-slate-500` — small enough to not compete with the category labels but clearly delineating the groups.
- Custom-styled checkboxes: an actual `<input type="checkbox">` with `sr-only` (screen-reader only) is overlaid by a styled `div` that shows the indigo fill when checked.

**Why custom-style the checkboxes instead of using native ones?** Native checkboxes have inconsistent appearance across browsers and operating systems. They cannot be styled to match the dark sidebar theme without being replaced entirely. The `sr-only` actual input preserves keyboard navigation and screen reader accessibility while giving full visual control.

**Why groups instead of a flat list?** 43 items in a flat list is overwhelming. Grouping by business type (Beauty, Auto, Trades, etc.) lets users find and select a relevant subset quickly without reading through all 43 names.

## StatsBar

Four metric cards above the map:

| Card | Colour | Meaning |
|---|---|---|
| Returned | Slate | Raw count from the last search response |
| New | Emerald | Results that weren't already in the table |
| Dupes | Amber | Results already present (skipped) |
| Total Unique | Indigo | Running total across all searches this session |

**Why these four?** They answer the implicit question after every search: "was that useful?" If Dupes is high relative to Returned, you've already covered this area for this category. If New is high, the search found fresh prospects. Total Unique shows the session's cumulative progress.

**Why large `text-2xl` numbers with tiny `text-[10px] uppercase` labels?** The number is the information; the label is context. Leading with the large number means you can read the stat at a glance without first processing the label.

## Results table

**Dark header, light rows.** The `bg-slate-800 text-slate-300` table header creates a strong visual anchor for the column names. Alternating `bg-white` / `bg-slate-50/60` rows aid reading across wide rows. `hover:bg-indigo-50` gives clear hover feedback.

**Sortable columns.** Name, Type, Rating, and Distance are sortable by clicking the column header. The sort indicator (`▲` / `▼`) is faint by default and becomes solid only for the active sort column. Hovering any column shows a faint indicator so the sorting capability is discoverable without cluttering the header.

**Filter input.** A single text filter above the table searches across name, type, address, and source query. This handles the common case of "I want to see all the barbers I found" after accumulating results across multiple searches.

**DB badge.** After importing to the database, rows that were imported show a small violet "DB" badge next to their name. This is a transient indicator: it shows only for the current import session. On the next page load, there's no badge (to avoid cluttering every row for users who have imported all their results). The purpose is to give immediate confirmation that the import worked.

## `/leads` page

**Tab-per-status layout.** Each `LeadStatus` value gets its own tab. This maps the pipeline stages directly to the navigation: TODO is your inbox, PENDING is work in progress, SUCCEEDED is closed deals. Switching tabs is the primary navigation pattern in a CRM-style workflow.

**Status dropdown inline in the table.** Rather than requiring the user to open a detail panel to change a lead's status, the dropdown sits directly in the table row. For a high-volume workflow (reviewing 50 TODO leads and moving some to PENDING), inline editing is significantly faster than open-edit-save cycles.

**Notes textarea saves on blur.** The notes field doesn't have an explicit save button. It saves automatically when focus leaves the field. This is consistent with how notes fields behave in tools like Notion and Linear. An explicit button would add one extra click per note — across many leads, this adds up.

**Lead score column.** The lead score (0–100) is displayed in the table to help prioritise within a tab. All leads in the TODO tab are worth calling, but a score-80 lead (no website, phone available, low gatekeeper risk) should be called before a score-35 lead (no website, no phone, high gatekeeper risk). The table defaults to sorting by score descending.

## Header bar

The main search page header contains:
- App name and subtitle (left)
- "Leads DB" nav pill (links to `/leads`)
- "Import to DB" button (violet, disabled until results exist)
- Error toast (right, dismissable)

**Why put the Import button in the header instead of the sidebar?** The Import action operates on the accumulated results, not on the search configuration. Placing it in the search sidebar would imply it's part of the search workflow. The header is the right place for actions that affect the whole page's state.

**Why violet for import-related elements?** The search UI uses indigo (Tailwind `indigo-600`). Import and database-related elements use violet (Tailwind `violet-600`). This creates a visual distinction: indigo = search, violet = database. When you see a violet element, it's telling you something about the database state.
