"use server";

import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import type { ActionResult, Comment } from "@/types";

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const CommentBodySchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(2000, "Comment too long"),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function assertBidProjectMember(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  bidId: string,
  userId: string
): Promise<boolean> {
  const { data: bid } = await supabase
    .from("bids")
    .select("project_id")
    .eq("id", bidId)
    .single();

  if (!bid) return false;

  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", bid.project_id)
    .single();

  if (project?.owner_id === userId) return true;

  const { data: collab } = await supabase
    .from("project_collaborators")
    .select("id")
    .eq("project_id", bid.project_id)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .single();

  return !!collab;
}

// ── createComment ─────────────────────────────────────────────────────────────

export async function createComment(
  bidId: string,
  body: string,
  parentId?: string
): Promise<ActionResult<Comment>> {
  const parsed = CommentBodySchema.safeParse({ body });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const isMember = await assertBidProjectMember(supabase, bidId, user.id);
  if (!isMember) return { success: false, error: "Access denied" };

  const { data, error } = await supabase
    .from("comments")
    .insert({
      bid_id: bidId,
      author_id: user.id,
      parent_id: parentId ?? null,
      body: parsed.data.body,
    })
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Failed to create comment" };
  }

  // Fire comment_added notification + log activity — best-effort, non-blocking
  try {
    const { data: bid } = await supabase
      .from("bids")
      .select("project_id, contractor:contractors(name)")
      .eq("id", bidId)
      .single();
    if (bid) {
      const bidName =
        (bid.contractor as { name?: string } | null)?.name ?? "a bid";
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      await fetch(`${baseUrl}/api/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
        },
        body: JSON.stringify({
          type: "comment_added",
          project_id: bid.project_id,
          triggered_by: user.id,
          reference_id: bidId,
          metadata: {
            comment_excerpt: parsed.data.body.slice(0, 100),
          },
        }),
      }).catch(() => {});

      await logActivity(bid.project_id, user.id, "comment_added", {
        bid_id: bidId,
        bid_name: bidName,
      });
    }
  } catch (e) {
    console.error("[createComment] notification/activity failed", e);
  }

  return { success: true, data: data as Comment };
}

// ── updateComment ─────────────────────────────────────────────────────────────

export async function updateComment(
  commentId: string,
  body: string
): Promise<ActionResult<Comment>> {
  const parsed = CommentBodySchema.safeParse({ body });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("comments")
    .update({ body: parsed.data.body, updated_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("author_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Failed to update comment" };
  }

  return { success: true, data: data as Comment };
}

// ── deleteComment ─────────────────────────────────────────────────────────────

export async function deleteComment(
  commentId: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  // Check if this comment has replies
  const { count } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", commentId);

  if ((count ?? 0) > 0) {
    // Soft delete: keep row but clear body
    const { error } = await supabase
      .from("comments")
      .update({ body: null, deleted: true, updated_at: new Date().toISOString() })
      .eq("id", commentId)
      .eq("author_id", user.id);

    if (error) return { success: false, error: error.message };
  } else {
    // Hard delete
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("author_id", user.id);

    if (error) return { success: false, error: error.message };
  }

  return { success: true, data: { id: commentId } };
}
