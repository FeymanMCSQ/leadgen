# Lead Pipeline

This document explains how raw Google Places results are transformed into actionable, scored, categorised leads in the database.

## The problem this solves

A Google Places Nearby Search for "barber_shop" near a suburb might return 20 results. Some businesses already have a professional website. Some are major chains (McDonald's, Coles). Some have no phone number, making them hard to contact. Some are permanently closed.

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
| Business is not OPERATIONAL | `DISCARDED` | Closed businesses are not prospects |
| Business name matches a chain keyword | `DISCARDED` | Chains have centralised marketing; cold calls don't work |
| Has a website | `DISCARDED` | Already has what we're selling — not a prospect |
| No website AND has phone | `TODO` | Perfect lead — contactable and lacks a web presence |
| No website AND no phone | `POTENTIAL_RESEARCH` | Good prospect but contact info needs research first |

**The core logic for a web dev agency:** You are selling websites. If a business already has one, they are not a prospect — regardless of whether they also have a phone. The phone number is how you *contact* a lead; it has nothing to do with whether they need your service. A business with no website and a phone number is the ideal case: you know they need you and you can reach them directly.

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

**Why keywords instead of the Google "chain" signal?** Google doesn't directly expose a "this is a chain" boolean. The keyword list, while imperfect, catches the vast majority of chains that would waste call time.

## Gatekeeper risk

Gatekeeper risk predicts how likely it is that calling the phone number will reach the decision-maker (the business owner) directly, versus a receptionist who screens calls:

| Risk level | Business types |
|---|---|
| `LOW` | Barbers, hair salons, beauty salons, nail salons, car repair, electricians, plumbers, pet groomers, yoga studios, laundry, florists |
| `MEDIUM` | Restaurants, cafés, gyms, physiotherapists, chiropractors, vet clinics |
| `HIGH` | Lawyers, accountants, dentists, doctors, medical clinics, hospitals, real estate agencies, banks, schools |
| `UNKNOWN` | Any type not in the above lists |

A barber shop is usually owner-operated — the person who answers the phone is often the owner. A dental clinic has a receptionist whose job is to screen calls. Low-gatekeeper leads are faster to work through and have a higher success rate.

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

The score is clamped to `[0, 100]`.

**Why store the score?** Computed at import time and stored as a column so the `/leads` page can sort by score with a simple `ORDER BY leadScore DESC` backed by an index. Computing on every read doesn't scale and can't be indexed.

**Why these weights?** "No website" is the primary signal (+40) because that's the qualifying criterion for the sale. "Has phone" is secondary (+25) because without it you can't call them. Gatekeeper risk adjusts expected difficulty of reaching the owner. Rating and review count are minor signals: a well-reviewed business is likely active and engaged — a more valuable prospect.

## Category buckets

Each business gets a `categoryBucket` label grouping related `primaryType` values:

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

## Status state machine

After import, a lead's `leadStatus` can be manually changed in the `/leads` UI or via the dashboard.

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

Manual transitions via the status dropdown in `/leads` or the dashboard lead cards are unrestricted.

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

## Quota counting

The dashboard tracks a daily call quota. A lead counts toward the quota when:

1. Its status transitions from `TODO` to any other status.
2. The same lead has not already been counted for the same local calendar date.

This is recorded in the `LeadStatusChange` table. The `countedForDailyQuota` boolean on each record tracks whether that transition counted. A lead can move from TODO → PENDING → TODO → PENDING in a day, but it only counts once.

**Why only TODO → other?** The point of the quota is to track how many "fresh" leads you have actioned — moved off the cold list. Subsequent status changes (PENDING → SUCCEEDED) are meaningful but shouldn't inflate the daily count.

## Suburb extraction

The `suburb` field is extracted from `formattedAddress` by taking the third-to-last comma-separated segment:

```
"12 Anzac Parade, Kensington, NSW 2033, Australia"
 part[0]          part[-3]   part[-2]  part[-1]
                  → "Kensington"
```

This is a heuristic that works for standard Australian address formats. The field is stored as nullable and used only for display — not for business logic.

## What `cleanPlace` does NOT do

- It does not call any external APIs. All decisions are made from data already returned by Google Places.
- It does not visit the website to check quality. Whether a business has a good or bad website is not evaluated.
- It does not analyse the phone number (e.g. VoIP vs landline).
- It does not update a lead's status if that lead already exists in the database. Existing leads keep whatever status a human has set.
