# Database

## Why Prisma ORM

Prisma was chosen over raw SQL, Drizzle, or Kysely for several reasons:

**Schema-first with generated types.** You write `prisma/schema.prisma` once, run `npx prisma generate`, and every model, relation, enum, and field becomes a TypeScript type. No manually-maintained interface files that drift from the actual database shape.

**Migration history.** `prisma migrate dev` generates a SQL file for each schema change and records which migrations have been applied in a `_prisma_migrations` table in the database. Rolling forward is one command. Rolling back requires writing a migration manually, but the history is always auditable.

**Readable query API.** Prisma's query builder reads like intent:
```typescript
prisma.businessLead.findMany({
  where: { leadStatus: 'TODO', hasWebsite: false },
  orderBy: { leadScore: 'desc' },
  take: 100,
})
```
Equivalent raw SQL is longer and easier to get wrong. For an internal tool with evolving query needs, the productivity gain outweighs the slight performance overhead Prisma adds over raw SQL.

**Single-vendor stack.** The project is already deployed on Prisma Compute. Using Prisma ORM + Prisma Postgres means the same team that maintains the deployment platform also maintains the database and the ORM — reducing the number of moving parts to debug.

## Why Prisma Postgres

Several database options were considered:

| Option | Reason not chosen |
|---|---|
| SQLite (local file) | Not suitable for server-deployed apps; no concurrent connections |
| Supabase Postgres | Would require a separate vendor account and credentials |
| Railway / Neon | Viable alternatives but introduce an extra vendor alongside Prisma Compute |
| Self-hosted Postgres | More operational overhead than warranted for a lead-gen tool |

Prisma Postgres was chosen because:
- The project is already on Prisma Compute (same console, same credentials).
- It provides a managed PostgreSQL instance with connection pooling built-in.
- No `DIRECT_URL` is needed — one connection string handles both migrations and runtime queries, unlike most pooled Postgres setups that require a separate direct connection for schema changes.

## The `directUrl` question

When this project was first set up, a `directUrl = env("DIRECT_URL")` line was added to `schema.prisma` based on a common pattern used with pooled Postgres databases (e.g. Supabase, Neon). These databases provide a pooler endpoint and a direct endpoint separately: the direct endpoint is needed for migrations because connection poolers often run in transaction mode, which Prisma Migrate is incompatible with.

Prisma Postgres is different. Its pooler is aware of migrations and the single `DATABASE_URL` works for both purposes. Confirmed from official Prisma docs:

> "If you are using Prisma with PostgreSQL, there is no need for `directUrl`."

The `directUrl` line was removed. The `DIRECT_URL` environment variable was never needed and was never set.

## Prisma version history

The project went through two Prisma major versions:

**Prisma 5.22.0** — installed initially. Used the traditional schema format where `url = env("DATABASE_URL")` lived inside the `datasource db {}` block in `schema.prisma`. The initial migration was applied at this version.

**Prisma 7.8.0** — upgraded when `@prisma/adapter-pg` 7.8.0 was installed (npm resolves the latest compatible version). Prisma 7 made a breaking change: the `url` field is no longer supported inside `schema.prisma`. Connection URLs must be configured in `prisma.config.ts` instead (for migrations) and passed directly to `PrismaClient` via the adapter (for runtime).

This is why the schema now has:
```prisma
datasource db {
  provider = "postgresql"
}
```
...with no `url` field, and `prisma.config.ts` has:
```typescript
datasource: {
  url: process.env.DATABASE_URL!,
}
```

## `prisma.config.ts`

This file was introduced in Prisma 6 and is the primary configuration mechanism in Prisma 7. It replaces the older pattern of putting migration config in `package.json#prisma`.

The config in this project does three things:
1. Points Prisma at the schema file.
2. Tells Prisma where to store migration files.
3. Wires the seed command (`tsx prisma/seed.ts`) so `npx prisma db seed` works without any `package.json` changes.

The `import 'dotenv/config'` at the top ensures `.env` is loaded before `process.env.DATABASE_URL` is read, which matters when the config file is executed by the Prisma CLI directly (not inside Next.js, which loads `.env` automatically).

## PrismaPg driver adapter

The `PrismaClient` singleton in `src/lib/prisma.ts` uses the `@prisma/adapter-pg` driver adapter:

```typescript
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

**Why a driver adapter instead of the default Prisma engine?**

The Prisma Query Engine is a Rust binary bundled with the Prisma client. It works well but:
- It spawns a separate process, which adds latency on cold starts.
- Driver adapters use the native `pg` module directly, eliminating the engine process.
- The `pg` library is a mature, widely-deployed PostgreSQL client that handles connection pooling, SSL, and error handling reliably.

In Prisma 7, the adapter pattern is the recommended way to connect when you control the connection pool configuration.

**Why a `Pool` rather than a single `Client`?**

`pg.Pool` manages a pool of reusable connections. In a Next.js server context, multiple API route handlers may execute concurrently. A single `pg.Client` would block: only one query can run at a time. A pool lets concurrent requests each get their own connection from the pool, up to the pool's configured maximum.

## Schema design

### `BusinessLead`

The central model. Each row represents a unique business identified by its Google `place_id`. The `googlePlaceId` field has a `@unique` constraint — this is the deduplication key. Importing the same business twice (from different searches or different days) does not create a duplicate row; instead the existing row's metadata is refreshed.

Key design decisions:
- `normalizedName` stores the lowercased, trimmed, punctuation-stripped version of the business name. This is computed at import time and stored so future deduplication or fuzzy-matching queries don't have to recompute it.
- `hasWebsite` and `hasPhone` are stored as booleans even though they're derivable from `websiteUri` and `nationalPhoneNumber`. Storing them separately means filter queries like `WHERE hasWebsite = false AND hasPhone = true` hit the boolean index rather than doing `IS NOT NULL` checks on nullable text columns.
- `leadScore` (0–100 integer) is computed and stored at import time. Storing it makes sorting by score in the UI a simple `ORDER BY leadScore DESC` with an index, rather than recomputing it on every read.
- `cleaningReasons` is a `String[]` (Postgres array). These are the human-readable strings explaining why a lead got its status (e.g. "No website — phone available for direct call"). They're logged once at import time for auditability; they don't change with the lead's status.

### `SearchRun`

Created every time the user imports results. Records what search was performed (mode, coordinates, radius, categories, text query) and what the outcome was (how many new vs existing leads, breakdown by status). This creates an audit trail: you can see exactly which searches produced which leads.

### `ImportEvent`

A join table linking a `BusinessLead` to the `SearchRun` that imported it. Also records whether the lead was new or existing at the time of import, and what status it had before and after. This means you can reconstruct the full history of a lead across multiple import events.

### `CallLog`

Records individual call attempts. Each entry has a `CallOutcome` enum value and an optional note. When a call log is created via `POST /api/leads/[id]/call-log`, the route also updates the lead's `leadStatus` based on a deterministic outcome-to-status mapping (e.g. `CLOSED` → `SUCCEEDED`, `NOT_INTERESTED` → `DEAD_END`).

### `AppSettings`

A single-row settings table (id is always `"default"`). Stores:
- `dailyCallQuota` — how many leads to action per day (default 5, range 1–200).
- `timezone` — IANA timezone string used to compute the local calendar date for quota resets (default `"Australia/Sydney"`).

Updated via `PATCH /api/settings`. Read via `GET /api/settings` (which upserts the default row if it doesn't exist).

### `LeadStatusChange`

Records every status transition made through the dashboard. Each row stores:
- `fromStatus` / `toStatus` — the before and after.
- `localDate` — the calendar date in the configured timezone when the change was made (format: `YYYY-MM-DD`).
- `countedForDailyQuota` — `true` if this transition counted toward the daily quota.

**Quota counting rule:** A transition counts when `fromStatus === 'TODO'` AND `toStatus !== 'TODO'` AND no previous counted record exists for the same `businessLeadId` on the same `localDate`. This means a lead can only contribute once to a day's quota, even if it's moved back to TODO and re-actioned.

The `localDate` field uses the `en-CA` locale with `Intl.DateTimeFormat` which produces `YYYY-MM-DD` — sortable and unambiguous across timezones.

## Indexes

All frequently-filtered columns on `BusinessLead` have explicit indexes:
- `leadStatus` — the leads page filters by this on every tab switch.
- `primaryType` and `suburb` — filter options.
- `hasWebsite`, `hasPhone` — used by the cleaner's logic and filter UI.
- `leadScore` — the default sort order.
- `isChainLikely` — useful for bulk exclusion queries.

`LeadStatusChange` indexes:
- `businessLeadId` — look up all changes for a given lead.
- `localDate` — count how many quota-counted changes happened today (dashboard summary query).
- `countedForDailyQuota` — filter to counted transitions only.

Without these indexes, filtering a table of thousands of leads or computing daily quota progress would require full table scans.

## Singleton pattern

`src/lib/prisma.ts` uses the global singleton pattern:

```typescript
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? makePrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Why this exists:** In Next.js development mode, the server hot-reloads on every file change. Without the singleton, each reload would instantiate a new `PrismaClient` (and therefore a new `pg.Pool`), leaking connections. After a few dozen reloads you'd exhaust the database's connection limit. The `globalThis` cache survives module re-evaluation so the same client instance is reused across reloads.

In production there is no hot-reload, so `globalForPrisma.prisma` is never set — a fresh client is created once at startup and used for the lifetime of the process.

**Why no `$disconnect()`:** Calling `prisma.$disconnect()` after each request would close and reopen the connection pool on every API call, eliminating the pooling benefit entirely. The pool stays open for the lifetime of the server process.
