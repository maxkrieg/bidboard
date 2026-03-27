import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { summarizeProject } from "@/lib/claude";
import type { ProjectSummaryInput } from "@/lib/claude";

const bodySchema = z.object({ project_id: z.string().uuid() });

export async function POST(request: Request) {
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { project_id } = parsed.data;
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("name, location, description, target_budget, target_date")
    .eq("id", project_id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: bids } = await admin
    .from("bids")
    .select(
      "total_price, status, contractor:contractors(name), ratings:bid_ratings(rating)"
    )
    .eq("project_id", project_id);

  const input: ProjectSummaryInput = {
    name: project.name,
    location: project.location,
    description: project.description,
    target_budget: project.target_budget,
    target_date: project.target_date,
    bids: (bids ?? []).map((b) => {
      const ratings = (b.ratings as { rating: number }[]) ?? [];
      const avg =
        ratings.length
          ? Math.round(
              (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10
            ) / 10
          : null;
      return {
        contractor_name: (b.contractor as { name: string }).name,
        total_price: b.total_price,
        status: b.status,
        avg_rating: avg,
      };
    }),
  };

  let summary: string;
  try {
    summary = await summarizeProject(input);
  } catch {
    return NextResponse.json(
      { error: "AI summarization failed" },
      { status: 500 }
    );
  }

  const { data: record, error } = await admin
    .from("project_summaries")
    .upsert(
      { project_id, summary, updated_at: new Date().toISOString() },
      { onConflict: "project_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json(record);
}
