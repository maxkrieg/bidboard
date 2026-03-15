# spec-bids.md — Bid Management

## Overview
Bids are the core data object in BidBoard. Each bid is associated with a project and a contractor. A bid contains a total price, line items, timeline, and optionally uploaded documents. Users can manage bid status and view all bids side-by-side.

---

## User Stories
- As a project member, I can add a new bid to a project by entering contractor details and pricing
- As a project member, I can add line items to break down a bid's costs
- As a project member, I can upload bid documents (PDFs, images) to a bid
- As a project member, I can view all bids on a project in a card layout
- As a project member, I can view the full detail of a single bid
- As a project member, I can compare all bids side-by-side in a table
- As a project member, I can mark a bid as Accepted, Rejected, or Pending
- As a project member, I can edit or delete a bid I added

---

## Pages

### Bids Tab — `/projects/[id]` (default tab)
- Row of bid cards, one per contractor
- Each card displays:
  - Contractor name
  - Total bid price (large, prominent)
  - Status badge (Pending / Accepted / Rejected)
  - Google rating + review count (if enriched)
  - Estimated duration in days
  - Bid expiry date (with amber highlight if within 7 days)
- "Add Bid" button — opens a slide-over panel or navigates to `/projects/[id]/bids/new`
- Below bid cards: AI Analysis panel (see spec-ai-analysis.md)

### Add / Edit Bid — `/projects/[id]/bids/new` and `/projects/[id]/bids/[bidId]/edit`
- Two-section form:

**Section 1 — Contractor**
- Contractor name (required, text) — triggers enrichment on save
- Phone (optional)
- Email (optional)
- Website (optional)
- Location pre-filled from project but editable

**Section 2 — Bid Details**
- Total price (required, currency input)
- Bid date (required, date picker)
- Expiry date (optional, date picker)
- Estimated duration in days (optional, number input)
- Notes (optional, textarea)

**Section 3 — Line Items**
- Dynamic table: Add/remove rows
- Columns: Description, Quantity, Unit, Unit Price, Total (auto-calculated)
- "Add Line Item" button appends a row
- Line item totals sum and compare against the entered total price — show a warning if they don't match

**Section 4 — Documents**
- File upload input: accepts PDF, JPG, PNG, up to 10MB per file
- List of uploaded files with remove option
- Files upload to Supabase Storage at path: `bid-documents/{project_id}/{bid_id}/{filename}`

### Bid Detail — `/projects/[id]/bids/[bidId]`
Two-column layout (desktop), single column (mobile):

**Left Column**
- Contractor info card: name, rating, review count, website, phone, license status, BBB rating, enriched date
- Bid summary: total price, bid date, expiry, estimated duration, status
- Line items table (read-only)
- Uploaded documents list with download links
- Edit / Delete bid actions (shown to all collaborators in v1)

**Right Column**
- Full-height threaded comments panel (see spec-collaboration.md)

### Bid Comparison — `/projects/[id]/compare`
- Side-by-side table
- Rows = union of all line item descriptions across all bids
- Columns = one per bid/contractor
- Cell values = line item price for that bid (empty if not present)
- Color coding per row: lowest value = green background, highest = red background
- Summary row at bottom: total price per bid
- AI summary panel below the table (condensed version)

---

## Server Actions — `actions/bids.ts`

### `createBid(projectId: string, data: CreateBidInput)`
```ts
type CreateBidInput = {
  contractor: {
    name: string
    phone?: string
    email?: string
    website?: string
  }
  total_price: number
  bid_date: string
  expiry_date?: string
  estimated_days?: number
  notes?: string
  line_items: LineItemInput[]
}
```
1. Verify user has access to the project
2. Validate with Zod
3. Upsert contractor: check for existing by name (fuzzy) or `google_place_id`
4. Insert `bids` row
5. Insert `bid_line_items` rows
6. Return bid id
7. After return: trigger `/api/enrich-contractor` as a background call (do not await)

### `updateBid(bidId: string, data: UpdateBidInput)`
1. Verify user has access to the project this bid belongs to
2. Update `bids` row
3. Delete existing `bid_line_items` and re-insert (simplest approach for v1)

### `deleteBid(bidId: string)`
1. Verify user has access to the project
2. Delete `bid_documents` from Supabase Storage
3. Delete `bids` row (cascades to line_items, documents, comments)

### `updateBidStatus(bidId: string, status: 'pending' | 'accepted' | 'rejected')`
1. Verify access
2. Update `bids.status`
3. If `accepted`: optionally set all other bids on the same project to `rejected` — confirm this behavior in UI with a dialog

### `uploadBidDocument(bidId: string, file: File)`
1. Verify access
2. Upload to Supabase Storage
3. Insert `bid_documents` row with `storage_path`

### `deleteBidDocument(documentId: string)`
1. Verify access
2. Delete from Supabase Storage
3. Delete `bid_documents` row

---

## Contractor Deduplication Logic

When creating a bid, before inserting a new contractor:
1. If `google_place_id` is known (post-enrichment flow): look up by `google_place_id`
2. Otherwise: fuzzy match by `lower(name)` within the same user's project history
3. If match found: reuse existing contractor record, link via `bids.contractor_id`
4. If no match: insert new `contractors` row

---

## RLS Policies

```sql
-- bids: project members can read
create policy "bids: read" on bids
  for select using (
    exists (
      select 1 from projects p
      left join project_collaborators pc on pc.project_id = p.id
      where p.id = project_id
        and (p.owner_id = auth.uid() or pc.user_id = auth.uid())
    )
  );

-- bids: project members can insert
create policy "bids: insert" on bids
  for insert with check (
    exists (
      select 1 from projects p
      left join project_collaborators pc on pc.project_id = p.id
      where p.id = project_id
        and (p.owner_id = auth.uid() or pc.user_id = auth.uid())
    )
  );

-- bids: project members can update
create policy "bids: update" on bids
  for update using (
    exists (
      select 1 from projects p
      left join project_collaborators pc on pc.project_id = p.id
      where p.id = project_id
        and (p.owner_id = auth.uid() or pc.user_id = auth.uid())
    )
  );

-- Same pattern applies to bid_line_items and bid_documents
```

---

## Files to Create
| File | Purpose |
|---|---|
| `app/(app)/projects/[id]/bids/new/page.tsx` | Add bid form |
| `app/(app)/projects/[id]/bids/[bidId]/page.tsx` | Bid detail + comments |
| `app/(app)/projects/[id]/bids/[bidId]/edit/page.tsx` | Edit bid form |
| `app/(app)/projects/[id]/compare/page.tsx` | Side-by-side comparison |
| `actions/bids.ts` | All bid server actions |
| `components/bids/BidCard.tsx` | Bid summary card |
| `components/bids/BidForm.tsx` | Add/edit bid form |
| `components/bids/LineItemsTable.tsx` | Dynamic line items editor |
| `components/bids/BidDocuments.tsx` | File upload + document list |
| `components/bids/BidStatusActions.tsx` | Accept/Reject/Pending buttons |
| `components/bids/ComparisonTable.tsx` | Side-by-side comparison table |
| `components/bids/ContractorCard.tsx` | Enriched contractor info display |
| `supabase/migrations/0003_bids.sql` | bids, line_items, documents, contractors tables + RLS |
