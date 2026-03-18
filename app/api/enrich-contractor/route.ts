import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchContractorPlace, getPlaceDetails } from "@/lib/google-places";
import { scrapeBBB, scrapeLicense } from "@/lib/firecrawl";
import { getLicenseUrl } from "@/lib/license-states";
import type { Contractor } from "@/types";

const BodySchema = z.object({
  contractorId: z.string().uuid(),
  projectLocation: z.string(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Validate internal secret
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { contractorId, projectLocation } = parsed.data;
  const admin = createAdminClient();

  // Fetch contractor
  const { data: contractor, error: fetchError } = await admin
    .from("contractors")
    .select("*")
    .eq("id", contractorId)
    .single();

  if (fetchError || !contractor) {
    console.error("[enrich-contractor] fetch error", fetchError);
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  const typedContractor = contractor as unknown as Contractor;

  // Skip if enriched within the last 7 days
  if (typedContractor.enriched_at) {
    const enrichedDate = new Date(typedContractor.enriched_at);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (enrichedDate > sevenDaysAgo) {
      console.log(`[enrich-contractor] skipping ${contractorId} — enriched recently`);
      return NextResponse.json({ skipped: true });
    }
  }

  const update: Record<string, unknown> = {
    enriched_at: new Date().toISOString(),
  };

  // ── Google Places ──────────────────────────────────────────────────────────
  try {
    const placeId = await searchContractorPlace(
      typedContractor.name,
      projectLocation
    );
    if (placeId) {
      update.google_place_id = placeId;
      const details = await getPlaceDetails(placeId);
      if (details) {
        if (details.address) update.address = details.address;
        if (details.rating !== null) update.google_rating = details.rating;
        if (details.reviewCount !== null)
          update.google_review_count = details.reviewCount;
        // Prefer Places website if contractor doesn't have one
        if (details.website && !typedContractor.website) {
          update.website = details.website;
        }
      }
    }
  } catch (err) {
    console.error("[enrich-contractor] google places error", err);
  }

  // ── BBB ────────────────────────────────────────────────────────────────────
  try {
    const bbb = await scrapeBBB(typedContractor.name, projectLocation);
    if (bbb) {
      update.bbb_rating = bbb.rating;
      update.bbb_accredited = bbb.accredited;
    }
  } catch (err) {
    console.error("[enrich-contractor] bbb error", err);
  }

  // ── License ────────────────────────────────────────────────────────────────
  try {
    const licenseUrl = getLicenseUrl(projectLocation, typedContractor.name);
    if (licenseUrl) {
      const license = await scrapeLicense(licenseUrl);
      if (license) {
        update.license_number = license.licenseNumber;
        update.license_status = license.licenseStatus;
      }
    }
  } catch (err) {
    console.error("[enrich-contractor] license error", err);
  }

  // ── Persist ────────────────────────────────────────────────────────────────
  const { error: updateError } = await admin
    .from("contractors")
    .update(update)
    .eq("id", contractorId);

  if (updateError) {
    console.error("[enrich-contractor] update error", updateError);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
