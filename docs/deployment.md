# Deployment

## Platform: Prisma Compute

The app is deployed to [Prisma Compute](https://console.prisma.io) — Prisma's managed application hosting platform. Prisma Compute was chosen because:

- The project already uses Prisma ORM and Prisma Postgres (same console, same credentials).
- It natively understands Next.js — no Dockerfile, no build configuration, no Nginx setup.
- It injects environment variables at deploy time via the `--env` flag, keeping secrets out of the repository.
- It runs in the same infrastructure as Prisma Postgres, minimising database latency.

The Compute project ID is `proj_cmr6275bb0dp2ysfahbzay8yy`. This is not a secret — it identifies your project in the Prisma platform, not a credential.

## Region: ap-southeast-1 (Singapore)

The app is deployed in the Singapore region. The target market for lead generation is Australian businesses (initially Sydney suburbs). Singapore is the nearest Prisma Compute region to Australia with the lowest expected latency for:
- Database queries (Prisma Postgres instance is in the same region)
- Google Places API calls (Google's Asia-Pacific infrastructure is geographically close)

An earlier deploy accidentally went to `fra` (Frankfurt, Europe) because the initial deploy command didn't specify a region and Frankfurt was the default. This was corrected by re-deploying with `--region ap-southeast-1` explicitly set in `prisma.compute.ts`.

## `prisma.compute.ts`

This file configures the Prisma Compute deployment:

```typescript
import { defineComputeConfig } from "@prisma/compute-sdk/config";

export default defineComputeConfig({
  app: {
    name: "local-lead-search",
    region: "ap-southeast-1",
    framework: "nextjs",
    httpPort: 3000,
  },
});
```

Note: this file (`prisma.compute.ts`) is separate from `prisma.config.ts` (which configures the ORM). Both files start with `prisma.` but serve different purposes:
- `prisma.compute.ts` — tells the Prisma Compute platform how to run the app.
- `prisma.config.ts` — tells the Prisma ORM how to connect to the database and run migrations.

## Deploy command

```
npx @prisma/cli app deploy \
  --project proj_cmr6275bb0dp2ysfahbzay8yy \
  --branch main \
  --env .env
```

The `--env .env` flag reads the local `.env` file and uploads the contained environment variables as encrypted secrets on the Compute platform. The variables are not stored in the repository — only the local `.env` (which is gitignored) is read at deploy time.

**Why `--branch main`?** Prisma Compute supports multiple branches (like Vercel preview deployments). Using `main` explicitly ensures every deploy targets the production branch, not an accidentally created feature branch.

## GitHub repository

The project is hosted at `https://github.com/FeymanMCSQ/leadgen`. It is used as the source of truth for the codebase. Prisma Compute can pull from a connected GitHub repo, or you can deploy directly from the CLI.

The repository contains:
- All source code
- `prisma/schema.prisma` and `prisma/migrations/` (migration SQL is safe to commit — it doesn't contain credentials)
- `prisma.compute.ts` and `prisma.config.ts`
- `.env.example` with placeholder values

The repository does **not** contain:
- `.env` (gitignored)
- `node_modules/` (gitignored)
- `.next/` (build output, gitignored)

## Running migrations on deploy

Prisma migrations (`prisma/migrations/`) are committed to the repository. When a new migration is needed:

1. Update `prisma/schema.prisma` locally.
2. Run `npx prisma migrate dev --name description_of_change`.
3. This generates a new SQL file in `prisma/migrations/` and applies it to the development database.
4. Commit the new migration file.
5. On the next deploy, run `npx prisma migrate deploy` (not `migrate dev`) against the production database. The `deploy` command applies only pending migrations — it does not generate new ones.

**Why not auto-run migrations at deploy time?** Migrations that drop columns or change constraints can cause downtime if the app is still running old code that expects the old schema. For a single-operator tool, this is low risk, but the explicit two-step (commit migration, then deploy) pattern keeps the migration history auditable and prevents accidental schema changes from being applied to production.

## Local development

```bash
npm install        # install all dependencies
npx prisma generate  # generate Prisma client types
npm run dev        # start Next.js dev server on port 3000
```

The app reads `.env` automatically in development (Next.js loads it). No `dotenv` import is needed in Next.js app code — only in standalone scripts (`prisma/seed.ts`, `scripts/verify-prisma.ts`) that run outside of Next.js.

```bash
npx prisma studio      # visual database browser at localhost:5555
npx tsx scripts/verify-prisma.ts  # quick DB connectivity check
npx prisma db seed     # re-run the seed file
```
