import Anthropic from "@anthropic-ai/sdk";
import type { BidAnalysis, BidExtractionResult } from "@/types";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-4-6";

interface BidLineItemInput {
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  total_price: number;
}

export interface BidPromptInput {
  bid_id: string;
  contractor_name: string;
  total_price: number;
  estimated_days: number | null;
  expiry_date: string | null;
  notes: string | null;
  line_items: BidLineItemInput[];
}

// Updated: 2026-03-18 — initial prompt
export const ANALYZE_BIDS_PROMPT = (
  bids: BidPromptInput[],
  projectDescription: string,
  criteria: string | null
) => `You are an expert home improvement advisor helping homeowners evaluate contractor bids.

Project: ${projectDescription}${criteria ? `\n\nHomeowner Criteria (must-haves and preferences):\n${criteria}` : ""}

Here are the bids submitted for this project:

${bids
  .map(
    (bid, i) => `
BID ${i + 1}
Contractor: ${bid.contractor_name}
Total Price: $${bid.total_price}
Estimated Duration: ${bid.estimated_days ? bid.estimated_days + " days" : "Not specified"}
Expiry Date: ${bid.expiry_date ?? "Not specified"}
Notes: ${bid.notes ?? "None"}

Line Items:
${bid.line_items.map((li) => `- ${li.description}: ${li.quantity} ${li.unit ?? ""} @ $${li.unit_price} = $${li.total_price}`).join("\n")}
`
  )
  .join("\n---\n")}

Please analyze these bids and respond ONLY with a valid JSON object matching this exact structure — no preamble, no markdown, no explanation outside the JSON:

{
  "summary": "A 2-4 sentence plain-English comparison of the bids overall. Focus on meaningful differences in price, scope, and timeline.",
  "bids": [
    {
      "bid_id": "<bid_id>",
      "contractor_name": "<name>",
      "score": <1-5 integer>,
      "highlights": ["<positive aspect 1>", "<positive aspect 2>"],
      "red_flags": ["<concern 1>", "<concern 2>"],
      "questions": ["<question to ask contractor 1>", "<question 2>"]
    }
  ]
}

Scoring guidelines (score field, integer 1–5):
- 5: Exceptional — competitive price, complete scope, meets all stated criteria, minimal concerns
- 4: Strong bid — meets most criteria, minor gaps or slightly higher price
- 3: Acceptable — meets some criteria, notable trade-offs
- 2: Below average — missing scope, doesn't meet key criteria, or multiple red flags
- 1: Seriously deficient — fails criteria, major concerns, incomplete
Return the bids array sorted from highest score to lowest.

Guidelines:
- Red flags should be specific and actionable (e.g. "No mention of permit costs" not "Missing items")
- Flag as a red flag any criterion that a bid clearly does not meet
- Highlights should note genuinely positive aspects including criteria that are explicitly addressed
- Questions should help the homeowner clarify scope gaps or ambiguities in this specific bid
- If a bid is clearly incomplete, note that in red flags
- Keep all strings concise — 1-2 sentences max per item
- Include an entry for every bid in the bids array
`;

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
    "bid_date": string | null,
    "expiry_date": string | null,
    "estimated_days": number | null,
    "notes": string | null
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
    "notes": string
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
`;

export async function extractBidFromDocument(
  fileBase64: string,
  mediaType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp"
): Promise<BidExtractionResult> {
  const isPdf = mediaType === "application/pdf";

  type ContentBlock =
    | { type: "document"; source: { type: "base64"; media_type: string; data: string } }
    | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
    | { type: "text"; text: string };

  const fileBlock: ContentBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: mediaType, data: fileBase64 } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data: fileBase64 } };

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: [fileBlock, { type: "text", text: EXTRACT_BID_PROMPT }] as any,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const clean = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean) as BidExtractionResult;
  } catch {
    throw new Error("Failed to parse extraction response");
  }
}

// ── Project Summary ───────────────────────────────────────────────────────────

export interface ProjectSummaryInput {
  name: string;
  location: string;
  description: string | null;
  criteria: string | null;
  target_budget: number | null;
  target_date: string | null;
  bids: Array<{
    contractor_name: string;
    total_price: number;
    status: string;
    avg_rating: number | null;
  }>;
}

const PROJECT_SUMMARY_PROMPT = (input: ProjectSummaryInput): string => {
  const budgetStr = input.target_budget
    ? `$${input.target_budget.toLocaleString()}`
    : "not set";
  const dateStr = input.target_date
    ? new Date(input.target_date).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "not set";

  const bidsStr =
    input.bids.length === 0
      ? "No bids received yet."
      : input.bids
          .map(
            (b) =>
              `- ${b.contractor_name}: $${b.total_price.toLocaleString()} (${b.status})${b.avg_rating ? ` [rated ${b.avg_rating}/5]` : ""}`
          )
          .join("\n");

  return `You are a project status advisor for a home improvement app. Write a 2-3 sentence plain-English status summary for this project. Be direct and informative. Focus on the current state: how many bids, price range, accepted contractor if any, whether bids appear to meet the project criteria, and overall outlook.

Project: ${input.name}
Location: ${input.location}
Budget: ${budgetStr} | Target: ${dateStr}${input.description ? `\nDescription: ${input.description}` : ""}${input.criteria ? `\nCriteria: ${input.criteria}` : ""}

Bids (${input.bids.length} total):
${bidsStr}

Respond with ONLY the summary text. No JSON, no labels, no preamble. 2-3 sentences maximum.`;
};

export async function summarizeProject(
  input: ProjectSummaryInput
): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 256,
    messages: [{ role: "user", content: PROJECT_SUMMARY_PROMPT(input) }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  if (!text) throw new Error("Empty summary response");
  return text;
}

// ── Bid Analysis ──────────────────────────────────────────────────────────────

export async function analyzeBids(
  bids: BidPromptInput[],
  projectDescription: string,
  criteria: string | null
): Promise<BidAnalysis> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: ANALYZE_BIDS_PROMPT(bids, projectDescription, criteria),
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  const clean = text.replace(/```json|```/g, "").trim();

  console.log("[anthropic] analyzeBids response:", clean);

  try {
    return JSON.parse(clean) as BidAnalysis;
  } catch {
    throw new Error("Failed to parse AI analysis response");
  }
}
