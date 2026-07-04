# Security

## API key management

### Google Places API key

The `GOOGLE_PLACES_API_KEY` is read exclusively inside server-side API route handlers:
- `src/app/api/places/nearby/route.ts`
- `src/app/api/places/text/route.ts`

It is never imported, referenced, or interpolated in any file under `src/components/` or `src/app/` outside of API routes. Next.js only exposes environment variables to the browser if they are prefixed with `NEXT_PUBLIC_`. Since `GOOGLE_PLACES_API_KEY` has no such prefix, Next.js will throw a build-time error if any client component attempts to read it.

**The threat model:** A Places API key embedded in browser JavaScript can be extracted by:
- Viewing page source
- Inspecting network requests (the key appears in the URL or headers)
- Scraping the compiled JavaScript bundle

Any of these would allow an attacker to make Google Places API calls billed to your account. There is no practical way to restrict a browser-exposed key sufficiently to prevent this.

**The proxy pattern:** The browser calls `/api/places/nearby` (your own server). Your server calls Google with the key attached server-side. The browser never sees the key. The worst an attacker can do with access to your app is make searches — which go through your server and cost you Places API money, but only if they have an account on your app (this is a single-operator tool with no public signup).

### Database connection string

The `DATABASE_URL` is read by:
- `prisma.config.ts` — used by the Prisma CLI for migrations
- `src/lib/prisma.ts` — used by `pg.Pool` to connect at runtime

It is never referenced in client components. Like the Places key, it has no `NEXT_PUBLIC_` prefix and cannot appear in browser bundles.

The connection string contains credentials that grant full read/write access to the Prisma Postgres database. Exposure would allow anyone to read, modify, or delete all lead data.

## `.env` and `.gitignore`

The `.env` file contains both secrets. It is listed in `.gitignore` and must never be committed to version control.

The `.gitignore` entries:
```
.env
.env.local
.env.*.local
```

The `.env.example` file is committed and contains placeholder values only:
```
DATABASE_URL="your_prisma_postgres_pooled_connection_url"
DIRECT_URL="your_direct_prisma_postgres_connection_url"
GOOGLE_PLACES_API_KEY="your_google_places_api_key"
```

This communicates to any future developer what variables are needed without exposing real credentials.

**At deploy time:** Secrets are injected via the `--env .env` flag on the `prisma app deploy` command. The Prisma Compute platform stores them as encrypted environment variables, not in the repository.

## What happened when `.next/` was accidentally committed

Early in development, `git add .` was run before `.next` was added to `.gitignore`. This committed the entire Next.js build output (compiled JavaScript, chunks, manifests) to the repository.

This is a security risk because:
- Build artifacts may contain environment variable values inlined during compilation.
- `NEXT_PUBLIC_` variables are definitely inlined. Non-public variables should not be, but it's worth verifying.
- Build artifacts are large and should not be in version control for practical reasons too.

The fix was:
1. Add `.next` and `out` to `.gitignore`.
2. Run `git rm -r --cached .` to clear the entire git index.
3. Re-run `git add .` to re-stage all files respecting the updated `.gitignore`.
4. Amend the commit to replace the dirty history.

After this fix, `git ls-files` showed only 25 source files — no build artifacts, no `node_modules`, no secrets.

## Google Places data policy

Google's [Places API Terms of Service](https://cloud.google.com/maps-platform/terms) restrict how Places data may be stored and cached. The key restrictions relevant to this tool:

- **`place_id` may be stored indefinitely.** Google explicitly exempts it from caching limits. This is why `googlePlaceId` is the database's primary deduplication key — it can be used as a persistent identifier.
- **Other fields have caching limits.** Data like `name`, `formattedAddress`, `nationalPhoneNumber`, `websiteUri`, and `rating` may be cached temporarily for the purpose of displaying the data to the user.
- **Data must not be used to seed a competing database product.** This tool is used by its operator for outreach; it is not republishing Places data.
- **Data may not be shared with third parties.** The tool is single-operator.

In practice, the lead records stored in `BusinessLead` represent a point-in-time snapshot of what Google returned. Phone numbers and websites are refreshed on re-import. This pattern is consistent with the caching intent of the Terms — the data is used to power the tool's display, not to build a permanent alternative directory.

## Input validation and injection risks

**SQL injection:** Prisma's query builder uses parameterised queries internally. String values passed to `prisma.businessLead.create({ data: { name: userInput } })` are never interpolated directly into SQL. SQL injection through Prisma's API is not possible.

**Command injection:** There are no shell commands constructed from user input anywhere in the codebase. The search query entered in the Text Search field is passed as a JSON string to `/api/places/text` and then directly to the Google Places API as a JSON body field — it is never executed as a shell command or evaluated as code.

**XSS:** All user-facing text rendering uses React's JSX, which escapes HTML by default. There are no `dangerouslySetInnerHTML` usages. External URLs from Google Places (website links, Maps links) are rendered as `<a href={url}>` — React does not execute these. However, for defence-in-depth, `rel="noopener noreferrer"` is set on all external links to prevent opened tabs from accessing `window.opener`.

**SSRF (Server-Side Request Forgery):** The Places API routes construct request URLs from hardcoded Google API endpoints. The only user-controlled input that reaches the Google API call is the search parameters (coordinates, radius, query text, type list). None of these control the destination URL — they are POST body parameters of a fixed Google endpoint. SSRF is not possible here.
