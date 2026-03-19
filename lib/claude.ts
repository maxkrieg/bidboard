import Anthropic from "@anthropic-ai/sdk";
import type { BidAnalysis } from "@/types";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
  projectDescription: string
) => `You are an expert home improvement advisor helping homeowners evaluate contractor bids.

Project: ${projectDescription}

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
`;

export async function analyzeBids(
  bids: BidPromptInput[],
  projectDescription: string
): Promise<BidAnalysis> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: ANALYZE_BIDS_PROMPT(bids, projectDescription),
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  const clean = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean) as BidAnalysis;
  } catch {
    throw new Error("Failed to parse AI analysis response");
  }
}
