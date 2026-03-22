# spec-bid-auto-population.md — Bid Auto-Population from Document Upload

## Overview
When adding a bid, a user can upload a PDF or image of a contractor's bid document. Claude analyzes the document and automatically extracts structured data — contractor name, pricing, line items, timeline, and other relevant fields — and pre-fills the bid form. The user reviews, corrects if needed, and saves.

---

## User Stories
- As a project member, I can upload a bid document (PDF or image) while filling out the bid form
- As a project member, I can see the form fields auto-populate from the uploaded document
- As a project member, I can clearly see which fields were auto-filled vs. manually entered
- As a project member, I can correct any incorrectly extracted fields before saving
- As a project member, I can still fill in the form manually if I don't upload a document
- As a project member, I can upload a document on an existing bid and re-extract to update fields

---

## User Flow

1. User navigates to `/projects/[id]/bids/new`
2. Form opens in its normal empty state
3. A document upload zone is prominently displayed at the top of the form
4. User uploads a PDF or image of their contractor's bid
5. Upload zone transitions to a loading state: "Reading your bid document..."
6. Claude extracts structured data from the document
7. Extracted fields animate into the form inputs
8. Fields that were auto-populated show a subtle "Auto-filled" indicator
9. User reviews all fields, corrects any errors, and fills in anything that wasn't extracted
10. User saves the bid normally

---

## UI — Upload Zone

Displayed at the top of the bid form, above all other fields:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   📎  Upload bid document to auto-fill          │
│       PDF or image · Up to 20MB                 │
│       Drag and drop or click to browse          │
│                                                 │
└─────────────────────────────────────────────────┘
```

Styling:
```
border-2 border-dashed border-zinc-200 rounded-lg
p-8 text-center cursor-pointer
hover:border-indigo-300 hover:bg-indigo-50
transition-colors duration-150
```

**States:**

**Default:** Dashed border, upload icon, helper text as above

**Drag over:**
```
border-indigo-400 bg-indigo-50
```

**Uploading / Extracting:**
```
border-indigo-300 bg-indigo-50
[Spinner] "Reading your bid document..."
```
Disable form inputs during extraction to prevent conflicting edits

**Complete:**
```
border-emerald-300 bg-emerald-50
[CheckCircle icon] "Extracted from [filename]"
[Change document] link on the right
```

**Error:**
```
border-red-300 bg-red-50
[AlertTriangle icon] "Couldn't read this document. Fill in the fields manually."
```

---

## Auto-Fill Indicators

When a field has been populated by extraction, show a subtle indicator:

```
[Input field with value]  ✦ Auto-filled
```

- Small `✦` icon + "Auto-filled" text in `text-xs text-indigo-500` positioned to the right of the field label
- Indicator disappears once the user manually edits that field — it's no longer "auto-filled" at that point
- No indicator on fields the user fills in manually after upload

This makes it clear what Claude extracted vs. what the user entered, building trust in the feature.

---

## Extraction Logic — `lib/claude.ts`

### Supported File Types
- PDF (primary case)
- JPG, PNG, WEBP (photos of physical bid documents)
- Max file size: 20MB

### Flow
1. File is uploaded to Supabase Storage at `bid-documents/{project_id}/temp/{filename}`
2. File is read and converted to base64
3. Sent to Claude API with extraction prompt (see below)
4. Response parsed into `BidExtractionResult`
5. Result returned to client to populate form
6. Temp file is moved to permanent path when bid is saved, or deleted if user abandons

### Claude API Call
Use the Anthropic SDK's vision capability for images and PDF document support:

```ts
export async function extractBidFromDocument(
  fileBase64: string,
  mediaType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<BidExtractionResult> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document' // use 'image' for image types
            source: {
              type: 'base64',
              media_type: mediaType,
              data: fileBase64
            }
          },
          {
            type: 'text',
            text: EXTRACT_BID_PROMPT
          }
        ]
      }
    ]
  })

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')

  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean) as BidExtractionResult
}
```

### Extraction Prompt — `EXTRACT_BID_PROMPT`

```ts
export const EXTRACT_BID_PROMPT = `
You are extracting structured data from a contractor bid document for a home improvement project.

Analyze this document and extract all available information. Respond ONLY with a valid JSON object — no preamble, no markdown, no explanation.

Return this exact structure:
{
  "contractor": {
    "name": string | null,
    "phone": string | null,
    "email": string | null,
    "website": string | null,
    "address": string | null,
    "license_number": string | null
  },
  "bid": {
    "total_price": number | null,
    "bid_date": string | null,       // ISO date format YYYY-MM-DD if found
    "expiry_date": string | null,    // ISO date format YYYY-MM-DD if found
    "estimated_days": number | null,
    "notes": string | null           // any general notes, terms, or conditions
  },
  "line_items": [
    {
      "description": string,
      "quantity": number | null,
      "unit": string | null,
      "unit_price": number | null,
      "total_price": number | null
    }
  ],
  "confidence": {
    "overall": "high" | "medium" | "low",
    "notes": string   // brief note on extraction quality e.g. "Handwritten document, some values uncertain"
  }
}

Guidelines:
- Return null for any field you cannot find or confidently extract
- For total_price, return a number only (no $ or commas)
- For dates, convert to YYYY-MM-DD format if possible
- For estimated_days, convert weeks/months to days if specified that way
- For line items, extract every line you can find — even if quantity/unit are missing
- If the document is not a contractor bid, return all fields as null and set confidence.overall to "low"
- Never guess or hallucinate values — null is always better than a wrong value
`
```

### Extraction Result Type

```ts
// types/index.ts
type BidExtractionResult = {
  contractor: {
    name: string | null
    phone: string | null
    email: string | null
    website: string | null
    address: string | null
    license_number: string | null
  }
  bid: {
    total_price: number | null
    bid_date: string | null
    expiry_date: string | null
    estimated_days: number | null
    notes: string | null
  }
  line_items: {
    description: string
    quantity: number | null
    unit: string | null
    unit_price: number | null
    total_price: number | null
  }[]
  confidence: {
    overall: 'high' | 'medium' | 'low'
    notes: string
  }
}
```

---

## API Route — `/api/extract-bid`

**Method:** POST
**Auth:** Requires valid Supabase session

**Request body:**
```ts
{
  file_base64: string
  media_type: string
  project_id: string  // for storage path scoping
}
```

**Response:**
```ts
{
  success: true
  data: BidExtractionResult
  temp_storage_path: string  // so client can reference the uploaded file
}
```

**Logic:**
1. Verify authenticated user has access to the project
2. Validate file size and media type
3. Store file temporarily in Supabase Storage
4. Call `extractBidFromDocument()` from `lib/claude.ts`
5. Return extraction result + temp storage path

---

## Client-Side Form Integration — `components/bids/BidForm.tsx`

### State additions
```ts
const [extractionResult, setExtractionResult] = useState<BidExtractionResult | null>(null)
const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set())
const [isExtracting, setIsExtracting] = useState(false)
const [tempStoragePath, setTempStoragePath] = useState<string | null>(null)
```

### On upload complete
```ts
async function handleDocumentUpload(file: File) {
  setIsExtracting(true)
  
  const base64 = await fileToBase64(file)
  const result = await fetch('/api/extract-bid', {
    method: 'POST',
    body: JSON.stringify({
      file_base64: base64,
      media_type: file.type,
      project_id: projectId
    })
  }).then(r => r.json())

  if (result.success) {
    applyExtractionToForm(result.data)
    setTempStoragePath(result.temp_storage_path)
    setExtractionResult(result.data)
  }
  
  setIsExtracting(false)
}
```

### Applying extraction to form
```ts
function applyExtractionToForm(extraction: BidExtractionResult) {
  const filled = new Set<string>()
  
  // Apply contractor fields
  if (extraction.contractor.name) {
    setValue('contractor.name', extraction.contractor.name)
    filled.add('contractor.name')
  }
  // ... repeat for all fields
  
  // Apply line items if extracted
  if (extraction.line_items.length > 0) {
    setValue('line_items', extraction.line_items)
    filled.add('line_items')
  }
  
  setAutoFilledFields(filled)
}
```

### Clearing auto-fill indicator on manual edit
```ts
// On any field change:
function handleFieldChange(fieldName: string) {
  setAutoFilledFields(prev => {
    const next = new Set(prev)
    next.delete(fieldName)
    return next
  })
}
```

---

## Confidence Warning

If `confidence.overall` is `"low"`:

Show a banner below the upload zone:
```
⚠ We had trouble reading this document clearly. Please review all fields carefully.
[confidence.notes text]
```

Styling:
```
bg-amber-50 border border-amber-200 rounded-md px-4 py-3
text-sm text-amber-800
```

---

## Re-extraction on Existing Bids

On the edit bid page (`/projects/[id]/bids/[bidId]/edit`):
- Show the same upload zone at the top
- If a document is already attached, show it as the current document with a "Re-extract from this document" button
- On re-extraction, fields are overwritten with new values and auto-fill indicators reappear
- Show a confirmation dialog: "This will overwrite your current field values with what's found in the document. Continue?"

---

## Files to Create / Modify

| File | Action | Purpose |
|---|---|---|
| `app/api/extract-bid/route.ts` | Create | Extraction API route |
| `lib/claude.ts` | Modify | Add `EXTRACT_BID_PROMPT` and `extractBidFromDocument()` |
| `types/index.ts` | Modify | Add `BidExtractionResult` type |
| `components/bids/BidForm.tsx` | Modify | Add upload zone + auto-fill state logic |
| `components/bids/DocumentUploadZone.tsx` | Create | Upload zone component with all states |
| `components/bids/AutoFillIndicator.tsx` | Create | Small indicator shown next to auto-filled labels |
