import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity";
import { analyzeBids } from "@/lib/claude";
import type { BidPromptInput } from "@/lib/claude";
import type { BidWithMeta } from "@/types";
import type { Json } from "@/lib/supabase/types";

const bodySchema = z.object({
  project_id: z.string().uuid(),
});

export async function POST(request: Request) {
  const internalSecret = request.headers.get("x-internal-secret");
  const isInternal =
    internalSecret && internalSecret === process.env.INTERNAL_API_SECRET;

  const admin = createAdminClient();
  let userId: string | null = null;

  if (!isInternal) {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { project_id } = parsed.data;

  // For user requests, verify membership
  if (!isInternal && userId) {
    const supabase = await createServerClient();
    const { data: projectForAuth } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", project_id)
      .single();

    if (!projectForAuth) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isMember =
      projectForAuth.owner_id === userId ||
      (await (async () => {
        const { data } = await supabase
          .from("project_collaborators")
          .select("id")
          .eq("project_id", project_id)
          .eq("user_id", userId!)
          .eq("status", "accepted")
          .maybeSingle();
        return !!data;
      })());

    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Fetch project (admin client works for both paths)
  const { data: project } = await admin
    .from("projects")
    .select("id, name, description, location, owner_id, criteria")
    .eq("id", project_id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fetch bids with contractor + line items
  const { data: bids, error: bidsError } = await admin
    .from("bids")
    .select("*, contractor:contractors(*), line_items:bid_line_items(*)")
    .eq("project_id", project_id);

  if (bidsError) {
    return NextResponse.json({ error: "Failed to fetch bids" }, { status: 500 });
  }

  if (!bids || bids.length < 2) {
    return NextResponse.json(
      { error: "At least 2 bids are required to run analysis" },
      { status: 400 }
    );
  }

  const promptInputs: BidPromptInput[] = (bids as BidWithMeta[]).map((bid) => ({
    bid_id: bid.id,
    contractor_name: bid.contractor.name,
    total_price: bid.total_price,
    estimated_days: bid.estimated_days,
    expiry_date: bid.expiry_date,
    notes: bid.notes,
    line_items: bid.line_items.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unit: li.unit,
      unit_price: li.unit_price,
      total_price: li.quantity * li.unit_price,
    })),
  }));

  const projectDescription = [project.name, project.description, project.location]
    .filter(Boolean)
    .join(" — ");

  let analysis: Awaited<ReturnType<typeof analyzeBids>>;
  try {
    analysis = await analyzeBids(promptInputs, projectDescription, project.criteria ?? null);
  } catch {
    return NextResponse.json(
      { error: "AI analysis failed. Please try again." },
      { status: 500 }
    );
  }

  // Upsert via admin client to bypass RLS complexity
  const { data: record, error: upsertError } = await admin
    .from("bid_analyses")
    .upsert(
      {
        project_id,
        summary: analysis.summary,
        analysis: analysis.bids as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" }
    )
    .select()
    .single();

  if (upsertError) {
    return NextResponse.json(
      { error: "Failed to save analysis" },
      { status: 500 }
    );
  }

  // Fire analysis_ready notification + log activity — user-triggered only, best-effort
  if (!isInternal && userId) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      await fetch(`${appUrl}/api/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
        },
        body: JSON.stringify({
          type: "analysis_ready",
          project_id,
          triggered_by: userId,
        }),
      }).catch(() => {});

      await logActivity(project_id, userId, "analysis_completed", {
        bid_count: bids.length,
      });
    } catch (e) {
      console.error("[analyze-bids] notification/activity failed", e);
    }
  }

  return NextResponse.json(record);
}
