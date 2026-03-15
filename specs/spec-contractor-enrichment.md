# spec-contractor-enrichment.md — Contractor Intelligence & Enrichment

## Overview
When a bid is saved, BidBoard automatically researches the contractor in the background. It pulls ratings and business info from Google Places, and attempts to surface license status and BBB information via web scraping. This enrichment runs asynchronously so it never blocks the user experience.

---

## User Stories
- As a project member, I can see a contractor's Google rating and review count alongside their bid automatically
- As a project member, I can see a contractor's website, phone, and address pulled from Google
- As a project member, I can see whether a contractor has a verified license
- As a project member, I can see a contractor's BBB rating if available
- As a project member, I know when the contractor data was last refreshed

---

## Enrichment Flow

```
User saves bid
     ↓
createBid() Server Action completes, returns bid id to client
     ↓
Client fires POST /api/enrich-contractor { contractor_id, project_location }
     ↓
API route checks enriched_at — skip if enriched within 7 days
     ↓
Query Google Places API → update contractors record
     ↓
Queue Firecrawl jobs for BBB + license lookup
     ↓
Update contractors record with additional data
     ↓
Client polls or receives realtime update → UI refreshes contractor card
```

---

## API Route — `/api/enrich-contractor`

**Method:** POST  
**Auth:** Requires valid Supabase session (validate server-side)

**Request body:**
```ts
{
  contractor_id: string
  project_location: string  // used as geo bias for Places search
}
```

**Logic:**
1. Fetch contractor record by `contractor_id`
2. Check `enriched_at` — if less than 7 days ago, return `{ skipped: true }`
3. Run Google Places enrichment (see below)
4. Run BBB + license enrichment (see below)
5. Update `contractors` row with all enriched fields + `enriched_at = now()`
6. Return `{ success: true }`

---

## Google Places Enrichment — `lib/google-places.ts`

### Search Query
Combine contractor name + project location:
```
"Acme Roofing" "Denver, CO"
```

Use the Places API **Text Search** endpoint:
```
GET https://maps.googleapis.com/maps/api/place/textsearch/json
  ?query={contractor_name}+{location}
  &type=contractor
  &key={GOOGLE_PLACES_API_KEY}
```

### Match Confidence
- Take the first result only if the name similarity is above a threshold (use simple string similarity check)
- If no confident match, store `google_enrichment_attempted: true` but leave rating fields null
- Do not guess — a null rating is better than a wrong one

### Fields to Extract
| Places Field | Stored In |
|---|---|
| `place_id` | `contractors.google_place_id` |
| `rating` | `contractors.google_rating` |
| `user_ratings_total` | `contractors.google_review_count` |
| `formatted_address` | `contractors.address` |
| `formatted_phone_number` | `contractors.phone` (if not already set) |
| `website` | `contractors.website` (if not already set) |
| `business_status` | Used to flag permanently closed businesses |

### Place Details Call
After text search, make a Place Details call to get phone and website:
```
GET https://maps.googleapis.com/maps/api/place/details/json
  ?place_id={place_id}
  &fields=name,rating,user_ratings_total,formatted_address,formatted_phone_number,website,business_status
  &key={GOOGLE_PLACES_API_KEY}
```

---

## BBB Enrichment — `lib/firecrawl.ts`

Use Firecrawl to search the BBB website for the contractor:

**Search URL:**
```
https://www.bbb.org/search?find_text={contractor_name}&find_loc={location}
```

**Extract:**
- BBB rating (A+, A, B, etc.)
- Accreditation status (Accredited / Not Accredited)
- Number of complaints
- Years in business (if listed)

**Handling:**
- BBB results are not always reliable matches — only store data if the business name matches closely
- If Firecrawl fails or times out, log the error and continue — BBB data is supplementary
- Store raw BBB URL in `contractors` for display as a link

---

## License Verification — `lib/firecrawl.ts`

Contractor license databases are state-specific. For v1, support a list of states with known public lookup URLs.

**Approach:**
1. Detect the state from `project_location`
2. Look up the state's contractor license verification URL from a static map in `lib/license-states.ts`
3. Use Firecrawl to query the URL with the contractor name
4. Extract license number, status (active/expired/suspended), and expiry date if available

**Supported states in v1 (expandable):**
- California: CSLB (cslb.ca.gov)
- Florida: DBPR (myfloridalicense.com)
- Texas: TDLR (tdlr.texas.gov)
- New York: DOS (dos.ny.gov)
- Colorado: DORA (dora.colorado.gov)

**Fallback:**
- If state not supported or lookup fails: set `license_verified: false`, display "License check not available in this state"

---

## Realtime UI Update

After enrichment completes, the contractor card in the UI should refresh without a full page reload.

**Approach:**
- Subscribe to Supabase Realtime on the `contractors` table for the relevant `contractor_id`
- When `enriched_at` updates, re-fetch and re-render the `ContractorCard` component
- Show a subtle loading skeleton on the contractor card while enrichment is pending

**Pending State Display:**
- Show "Researching contractor..." with a spinner in the contractor card
- Once enriched: animate in the rating, review count, and other data

---

## Contractor Card UI — `components/bids/ContractorCard.tsx`

Displays enriched data alongside the bid:

```
┌─────────────────────────────────┐
│ Acme Roofing & Construction     │
│ ★ 4.7  (142 Google reviews)     │
│ 📍 1234 Main St, Denver CO      │
│ 🌐 acmeroofing.com              │
│ 📞 (303) 555-0100               │
│                                 │
│ BBB: A+  ✓ Accredited           │
│ License: Active #CR-123456 (CO) │
│ Last updated: March 10, 2026    │
└─────────────────────────────────┘
```

- Green checkmark for active license, red X for expired/suspended, grey dash for unknown
- BBB rating displayed as a badge with color coding (A+/A = green, B = amber, C and below = red)
- "Last updated" shown in muted text with a "Refresh" icon that re-triggers enrichment

---

## Error Handling & Logging

- All enrichment errors are caught and logged server-side — never surface raw errors to the UI
- If Google Places fails: show contractor name only, no rating
- If BBB fails: omit BBB section from card
- If license lookup fails: show "License info unavailable"
- Log failed enrichment attempts with `contractor_id`, `error`, and `timestamp` to a `enrichment_logs` table for debugging

---

## Files to Create
| File | Purpose |
|---|---|
| `app/api/enrich-contractor/route.ts` | Enrichment API route |
| `lib/google-places.ts` | Google Places API helpers |
| `lib/firecrawl.ts` | Firecrawl scraping helpers |
| `lib/license-states.ts` | State license URL map |
| `components/bids/ContractorCard.tsx` | Enriched contractor display |
| `supabase/migrations/0004_contractor_enrichment.sql` | Add enrichment fields to contractors table |
