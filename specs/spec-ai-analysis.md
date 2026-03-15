# spec-ai-analysis.md — AI Bid Analysis

## Overview
BidBoard uses the Anthropic Claude API to analyze bids across a project and surface a plain-English comparison, red flags, and suggested questions for each contractor. Analysis is triggered manually by a project member and the results are stored and shared with all collaborators.

---

## User Stories
- As a project member, I can trigger an AI analysis of all bids on a project
- As a project member, I can see a plain-English summary of how the bids compare
- As a project member, I can see specific red flags flagged for each bid
- As a project member, I can see suggested questions to ask each contractor
- As a project member, I can see highlights (positive aspects) for each bid
- As a project member, I can re-run the analysis after new bids are added
- As a collaborator, I can view the analysis results my co-owner generated

---

## Analysis Trigger & Display

### Where it lives
The AI Analysis panel sits below the bid cards on the Bids tab of the project view (`/projects/[id]`).

### States
1. **No analysis yet**: Panel shows "Run AI Analysis" button with a short explanation of what it does
2. **Loading**: Button replaced with a progress indicator — "Analyzing bids..." (typically 5–15 seconds)
3. **Complete**: Full analysis output rendered (see UI section below)
4. **Stale**: If bids have been added/edited since last analysis, show a banner: "Bids have changed since this analysis. Re-run for updated results." with a "Re-run Analysis" button

### Stale Detection
Track `bid_analyses.created_at` vs the latest `bids.updated_at` across all bids on the project. If any bid is newer than the analysis, mark as stale.

---

## API Route — `/api/analyze-bids`

**Method:** POST  
**Auth:** Requires valid Supabase session

**Request body:**
```ts
{
  project_id: string
}
```

**Logic:**
1. Verify user has access to the project
2. Fetch all bids with line items and contractor info for the project
3. Construct prompt (see Prompt Design below)
4. Call Claude API — `claude-sonnet-4-20250514`, max_tokens: 4096
5. Parse response into `BidAnalysis` shape
6. Upsert `bid_analyses` row for the project (one active analysis per project at a time)
7. Return the analysis object

---

## Claude Integration — `lib/claude.ts`

### Client Setup
```ts
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})
```

### Output Type
```ts
type BidAnalysis = {
  summary: string
  bids: {
    bid_id: string
    contractor_name: string
    highlights: string[]
    red_flags: string[]
    questions: string[]
  }[]
}
```

### Prompt — `ANALYZE_BIDS_PROMPT`
Defined as a named constant in `lib/claude.ts`. Do not inline in API routes.

```ts
export const ANALYZE_BIDS_PROMPT = (bids: BidPromptInput[], projectDescription: string) => `
You are an expert home improvement advisor helping homeowners evaluate contractor bids.

Project: ${projectDescription}

Here are the bids submitted for this project:

${bids.map((bid, i) => `
BID ${i + 1}
Contractor: ${bid.contractor_name}
Total Price: $${bid.total_price}
Estimated Duration: ${bid.estimated_days ? bid.estimated_days + ' days' : 'Not specified'}
Expiry Date: ${bid.expiry_date ?? 'Not specified'}
Notes: ${bid.notes ?? 'None'}

Line Items:
${bid.line_items.map(li => `- ${li.description}: ${li.quantity} ${li.unit} @ $${li.unit_price} = $${li.total_price}`).join('\n')}
`).join('\n---\n')}

Please analyze these bids and respond ONLY with a valid JSON object matching this exact structure — no preamble, no markdown, no explanation outside the JSON:

{
  "summary": "A 2-4 sentence plain-English comparison of the bids overall. Focus on meaningful differences in price, scope, and timeline.",
  "bids": [
    {
      "bid_id": "<bid_id>",
      "contractor_name": "<name>",
      "highlights": ["<positive aspect 1>", "<positive aspect 2>"],
      "red_flags": ["<concern 1>", "<concern 2>"],
      "questions": ["<question to ask contractor 1>", "<question 2>"]
    }
  ]
}

Guidelines:
- Red flags should be specific and actionable (e.g. "No mention of permit costs" not "Missing items")
- Questions should help the homeowner clarify scope gaps or ambiguities in this specific bid
- Highlights should note genuinely positive aspects — do not manufacture praise
- If a bid is clearly incomplete, note that in red flags
- Keep all strings concise — 1-2 sentences max per item
- Include an entry for every bid in the bids array
`
```

### Parsing
```ts
export async function analyzeBids(bids: BidPromptInput[], projectDescription: string): Promise<BidAnalysis> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: ANALYZE_BIDS_PROMPT(bids, projectDescription)
      }
    ]
  })

  const text = response.content
    .filter(block => block.type === "text")
    .map(block => block.text)
    .join("")

  // Strip any accidental markdown fences
  const clean = text.replace(/```json|```/g, "").trim()
  
  try {
    return JSON.parse(clean) as BidAnalysis
  } catch {
    throw new Error("Failed to parse AI analysis response")
  }
}
```

---

## Storage

Analysis results are stored in the `bid_analyses` table:

```sql
id              uuid PK
project_id      uuid FK → projects (unique — one active analysis per project)
generated_by    uuid FK → users
summary         text
red_flags       jsonb  -- array of { bid_id, flags[] }
questions       jsonb  -- array of { bid_id, questions[] }
highlights      jsonb  -- array of { bid_id, highlights[] }
model_version   text   -- store model string for future reference
created_at      timestamp
```

Use `upsert` on `project_id` so re-running replaces the previous analysis rather than appending.

---

## UI — Analysis Panel

### Summary Section
- Displayed as a styled prose block below the bid cards
- Subtle indigo left border to visually distinguish AI content
- Label: "AI Summary" with a small sparkle icon

### Per-Bid Sections
Rendered as an accordion or tab set — one section per bid:

```
▼ Acme Roofing
  ✓ Highlights
    • Most detailed line item breakdown of all bids
    • Includes permit costs explicitly

  ⚠ Red Flags
    • No mention of cleanup or debris removal
    • Expiry date is only 10 days away

  ? Questions to Ask
    • Does your price include the building permit fee?
    • What is your policy for debris removal after completion?
```

- Highlights: green text / check icon
- Red flags: amber text / warning icon
- Questions: blue text / question icon
- Each item is a single line — concise by design

### Footer
- "Analysis generated [date] by [user name]"
- "Re-run Analysis" button (always visible once analysis exists)
- Stale banner appears above summary if bids have changed

---

## Minimum Bid Count
- Analysis requires at least 2 bids — show a message if fewer exist: "Add at least 2 bids to run a comparison analysis"
- Analysis with a single bid can still run for red flags and questions — implement this as a future enhancement

---

## RLS Policies

```sql
-- bid_analyses: project members can read
create policy "analyses: read" on bid_analyses
  for select using (
    exists (
      select 1 from projects p
      left join project_collaborators pc on pc.project_id = p.id
      where p.id = project_id
        and (p.owner_id = auth.uid() or pc.user_id = auth.uid())
    )
  );

-- bid_analyses: project members can insert/update
create policy "analyses: upsert" on bid_analyses
  for all using (
    exists (
      select 1 from projects p
      left join project_collaborators pc on pc.project_id = p.id
      where p.id = project_id
        and (p.owner_id = auth.uid() or pc.user_id = auth.uid())
    )
  );
```

---

## Files to Create
| File | Purpose |
|---|---|
| `app/api/analyze-bids/route.ts` | Analysis API route |
| `lib/claude.ts` | Anthropic client, prompt constants, analyzeBids() |
| `components/bids/AnalysisPanel.tsx` | Full analysis display component |
| `components/bids/AnalysisBidSection.tsx` | Per-bid highlights/flags/questions accordion |
| `supabase/migrations/0005_bid_analyses.sql` | bid_analyses table + RLS |
