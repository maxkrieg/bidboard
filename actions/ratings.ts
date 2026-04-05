"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { triggerProjectSummary, triggerBidAnalysis } from "@/lib/activity";
import type { ActionResult, BidRating } from "@/types";

const RatingSchema = z.object({
  bidId: z.string().uuid("Invalid bid ID"),
  rating: z.number().int().min(1).max(5),
});

export async function upsertBidRating(
  bidId: string,
  rating: number
): Promise<ActionResult<BidRating>> {
  const parsed = RatingSchema.safeParse({ bidId, rating });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify the user is a project member via the bid
  const { data: bid } = await supabase
    .from("bids")
    .select("project_id")
    .eq("id", parsed.data.bidId)
    .single();

  if (!bid) return { success: false, error: "Bid not found." };

  // Upsert — RLS allows users to insert/update their own rating
  const { data, error } = await supabase
    .from("bid_ratings")
    .upsert(
      {
        bid_id: parsed.data.bidId,
        user_id: user.id,
        rating: parsed.data.rating,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "bid_id,user_id" }
    )
    .select()
    .single();

  if (error || !data) {
    console.error("[upsertBidRating]", error);
    return { success: false, error: "Failed to save rating." };
  }

  triggerProjectSummary(bid.project_id);
  triggerBidAnalysis(bid.project_id);
  return { success: true, data: data as BidRating };
}
