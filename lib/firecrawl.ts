/**
 * Firecrawl helpers for BBB scraping and state license lookups.
 * All functions are best-effort and return null on any failure.
 *
 * Uses the v1 legacy client (FirecrawlApp) which supports prompt-based extraction.
 * We use prompts instead of Zod schemas to avoid Zod v3/v4 type incompatibility.
 */

import FirecrawlApp from "@mendable/firecrawl-js";

function getClient(): InstanceType<typeof FirecrawlApp>["v1"] | null {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  const app = new FirecrawlApp({ apiKey: key });
  return app.v1;
}

export interface BBBResult {
  rating: string | null;
  accredited: boolean;
}

export interface LicenseResult {
  licenseNumber: string | null;
  licenseStatus: string | null;
}

/**
 * Scrape BBB for a contractor's rating and accreditation status.
 */
export async function scrapeBBB(
  name: string,
  location: string
): Promise<BBBResult | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const url = `https://www.bbb.org/search?find_text=${encodeURIComponent(name)}&find_loc=${encodeURIComponent(location)}`;

    const result = await client.scrapeUrl(url, {
      formats: ["extract"],
      extract: {
        prompt:
          'Extract the BBB letter rating (e.g. "A+", "A", "B", "C", "F") and whether the first matching business is BBB accredited. Return JSON: { "rating": string | null, "accredited": boolean }',
      },
    });

    if (!result.success || !result.extract) return null;

    const extracted = result.extract as { rating?: string; accredited?: boolean };
    return {
      rating: extracted.rating ?? null,
      accredited: extracted.accredited ?? false,
    };
  } catch (err) {
    console.error("[firecrawl] scrapeBBB error", err);
    return null;
  }
}

/**
 * Scrape a state license lookup page for license number and status.
 */
export async function scrapeLicense(url: string): Promise<LicenseResult | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const result = await client.scrapeUrl(url, {
      formats: ["extract"],
      extract: {
        prompt:
          'Extract the contractor license number and license status (active/expired/suspended/revoked) from this page. Return JSON: { "licenseNumber": string | null, "licenseStatus": string | null }',
      },
    });

    if (!result.success || !result.extract) return null;

    const extracted = result.extract as {
      licenseNumber?: string;
      licenseStatus?: string;
    };
    return {
      licenseNumber: extracted.licenseNumber ?? null,
      licenseStatus: extracted.licenseStatus ?? null,
    };
  } catch (err) {
    console.error("[firecrawl] scrapeLicense error", err);
    return null;
  }
}
