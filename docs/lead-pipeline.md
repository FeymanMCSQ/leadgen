# Lead Pipeline

This document explains how raw Google Places results are transformed into actionable, scored, categorised leads in the database.

## The problem this solves

A Google Places Nearby Search for "barber_shop" near a suburb might return 20 results. Some of those businesses already have a professional website. Some are major chains (Great Clips, Supercuts). Some have no phone number and no website, making them hard to contact. Some are permanently closed.

Without processing, you'd have to manually evaluate each result before deciding who to call. The lead pipeline automates that triage.

## Pipeline stages

```
NormalizedPlace (from Google Places)
       │
       ▼
  cleanPlace()              ← src/lib/lead-cleaner.ts
       │
       ├── normalizedName   (lowercase, trimmed, punctuation removed)
       ├── suburb           (extracted from formatted address)
       ├── hasWebsite       (boolean)
       ├── hasPhone         (boolean)
       ├── isChainLikely    (keyword + type detection)
       ├── gatekeeperRisk   (based on primaryType)
       ├── categoryBucket   (human label for the business type)
       ├── leadStatus       (TODO / POTENTIAL_RESEARCH / DISCARDED)
       └── leadScore        (0–100 integer)
       │
       ▼
  importPlacesToDatabase()  ← src/lib/lead-importer.ts
       │
       ├── Creates SearchRun
       ├── Upserts BusinessLead (new or refresh existing metadata)
       ├── Creates ImportEvent
       └── Returns ImportSummary
```

## Lead status assignment

`leadStatus` is assigned based on a priority-ordered set of rules. The first matching rule wins:

| Rule | Status | Rationale |
|---|---|---|
| Business is not OPERATIONAL | `DISCARDED` | Closed or temporarily closed businesses are not prospects |
| Business name matches a chain keyword | `DISCARDED` | Chains have centralised marketing; local sales calls are pointless |
| No website AND has phone | `TODO` | Highest priority: they're contactable and lack a web presence |
| No website AND no phone | `POTENTIAL_RESEARCH` | Need to find contact info manually before calling |
| Has website AND no phone | `POTENTIAL_RESEARCH` | Might have contact form; check before discarding |
| Has website AND has phone | `DISCARDED` | Already has a complete web presence; not a prospect |

**Why this ordering matters:** The "no website + phone" case is deliberately the highest priority `TODO` because:
- The business has demonstrated they're reachable (they have a phone).
- They demonstrably lack a website (which is what we're selling).
- There's no research step needed — you can call them immediately.

The `POTENTIAL_RESEARCH` status covers ambiguous cases. These leads aren't discarded because there might be value there; they just require a manual step before calling.

## Chain detection

Chains are detected by checking the normalised business name against a keyword list:

```
mcdonald, kfc, subway, domino, hungry jack, oporto, guzman,
coles, woolworths, aldi, iga, 7-eleven, bp, shell, caltex,
ampol, chemist warehouse, priceline, officeworks, bunnings,
kmart, target, big w, anytime fitness, snap fitness, plus fitness,
f45, orange theory, boost juice, starbucks, gloria jeans, ...
```

Additionally, businesses with a `primaryType` of `shopping_mall` or `department_store` are flagged as chains regardless of name.

**Why keywords instead of the Google "chain" signal?** Google doesn't directly expose a "this is a chain" boolean. The `types` array can include signals like `point_of_interest` vs `establishment`, but these don't reliably distinguish owner-operated businesses from franchises. The keyword list, while imperfect, catches the vast majority of chains that would waste call time.

**Why not use rating count as a chain proxy?** A high review count could indicate a chain OR simply a popular local business. A high-rated local café with 500 reviews is exactly the kind of business worth calling. Using review count as a chain signal would produce too many false positives.

## Gatekeeper risk

Gatekeeper risk predicts how likely it is that calling the phone number will reach the decision-maker (the business owner) directly, vs a receptionist or admin who screens calls:

| Risk level | Business types |
|---|---|
| `LOW` | Barbers, hair salons, beauty salons, nail salons, car repair, electricians, plumbers, pet groomers, yoga studios, laundry, florists |
| `MEDIUM` | Restaurants, cafés, gyms, physiotherapists, chiropractors, vet clinics |
| `HIGH` | Lawyers, accountants, dentists, doctors, medical clinics, hospitals, real estate agencies, banks, schools |
| `UNKNOWN` | Any type not in the above lists |

**Why this matters for prioritisation:** A barber shop is usually owner-operated. The person who answers the phone is often the owner. Call success rate is high. A dental clinic has a receptionist whose job is to screen calls; even if the dentist wants a website, getting them on the phone is hard. Low-gatekeeper leads are faster to work through.

The gatekeeper risk is stored on the lead and surfaced in the `/leads` table so you can sort your TODO list by it.

## Lead scoring (0–100)

`leadScore` is a single integer that rolls up multiple signals into a prioritisation rank. Higher is better. It is computed by `scoreLead()` after `cleanPlace()` has assigned the other fields.

| Signal | Score change |
|---|---|
| No website | +40 |
| Has phone | +25 |
| Gatekeeper risk: LOW | +15 |
| Rating ≥ 4.3 | +10 |
| Review count ≥ 20 | +10 |
| Review count ≥ 5 (but < 20) | +8 |
| Gatekeeper risk: HIGH | −25 |
| Gatekeeper risk: MEDIUM | −10 |
| Chain detected | −50 |
| Business not OPERATIONAL | −40 |
| Has website AND has phone | −30 |

The score is clamped to `[0, 100]`.

**Why store the score?** The score is computed at import time and stored as a column. This lets the `/leads` page sort by score with a simple `ORDER BY leadScore DESC` backed by an index. Computing the score on every read would require fetching all relevant fields and calculating in application code, which doesn't scale and can't be indexed.

**Why these weights?** The weights reflect the goal of the tool: finding owner-operated local businesses that lack a website. "No website" is the primary signal (+40) because that's the qualifying criterion for the sale. "Has phone" is secondary (+25) because without a phone, you can't call them. Gatekeeper risk adjusts the expected difficulty of actually reaching the owner. Rating and review count are minor signals: a well-reviewed business is likely still operating and engaged, making them a more valuable prospect.

## Category buckets

Each business gets a `categoryBucket` label that groups related `primaryType` values into a human-readable category:

| Bucket | Types it covers |
|---|---|
| Beauty | barber_shop, hair_salon, beauty_salon, nail_salon, spa, massage, skin_care_clinic, tanning_studio |
| Auto | car_repair, car_wash, tire_shop, auto_parts_store |
| Trades | electrician, plumber, painter, roofing_contractor, locksmith, moving_company |
| Pets | pet_store, pet_care, pet_boarding_service, veterinary_care |
| Food | bakery, cafe, coffee_shop, restaurant, catering_service |
| Health | dentist, physiotherapist, doctor, medical_clinic, chiropractor |
| Professional Services | lawyer, accounting, insurance_agency, real_estate_agency |
| Fitness | gym, fitness_center, yoga_studio, sports_coaching |

**Why bucket?** The `/leads` page and future filter UI can group or filter by bucket rather than exposing raw Google type strings like `physiotherapist` or `roofing_contractor` to the user.

## Status state machine

After import, a lead's `leadStatus` can be manually changed in the `/leads` UI or automatically advanced by the call log system.

```
TODO ──────────────────────────────────────────────► CONTACTED
  │                                                      │
  │    ┌──────────────────────────────────────────────── │
  │    ▼                                                 ▼
  └──► POTENTIAL_RESEARCH                            PENDING
                                                        │
                                              ┌─────────┴──────────┐
                                              ▼                    ▼
                                          DEAD_END            SUCCEEDED
                                              │
                                         DO_NOT_CALL
```

Manual transitions via the status dropdown in `/leads` are unrestricted — you can move a lead to any status at any time.

Automatic transitions via `POST /api/leads/[id]/call-log` follow this mapping:

| Call outcome | New status |
|---|---|
| NO_ANSWER | CONTACTED |
| WRONG_NUMBER | POTENTIAL_RESEARCH |
| GATEKEEPER | PENDING |
| OWNER_UNAVAILABLE | PENDING |
| PERMISSION_TO_SEND | PENDING |
| SENT_LINK | PENDING |
| NOT_INTERESTED | DEAD_END |
| FOLLOW_UP | PENDING |
| CLOSED | SUCCEEDED |
| DO_NOT_CALL | DO_NOT_CALL |
| OTHER | CONTACTED |

**Why automatic status advancement?** Requiring the user to manually change the status after logging a call outcome is redundant. The outcome already implies the next state. Automating it reduces friction and keeps the pipeline moving correctly even if the user forgets to update the status manually.

## Suburb extraction

The `suburb` field is extracted from `formattedAddress` by taking the third-to-last comma-separated segment:

```
"12 Anzac Parade, Kensington, NSW 2033, Australia"
 part[0]          part[-3]   part[-2]  part[-1]
                  → "Kensington"
```

This is a heuristic that works for standard Australian address formats. It may produce incorrect results for addresses with unusual formats (e.g. building names, no suburb). The field is stored as nullable and used only for display and future filtering — it's not used for any business logic.

## What `cleanPlace` does NOT do

- It does not call any external APIs. All decisions are made from the data already returned by Google Places.
- It does not look up the website to check whether it's a "real" website vs a placeholder. That would require web scraping and is not in scope.
- It does not analyse the phone number (e.g. to detect if it's a VoIP number or call centre). The number is taken at face value.
- It does not update a lead's status if that lead already exists in the database. The importer (`lead-importer.ts`) only calls `cleanPlace()` for new leads. Existing leads keep whatever status a human has set.
