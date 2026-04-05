"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { ActionResult, UserNote } from "@/types";

const UpsertNoteSchema = z.object({
  projectId: z.string().uuid(),
  bidId: z.string().uuid().nullable(),
  body: z.string(),
});

export async function upsertNote(
  projectId: string,
  bidId: string | null,
  body: string
): Promise<ActionResult<UserNote>> {
  const parsed = UpsertNoteSchema.safeParse({ projectId, bidId, body });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // SELECT then INSERT or UPDATE (avoids partial-index upsert complexity)
  const baseQuery = supabase
    .from("user_notes")
    .select("id")
    .eq("user_id", user.id)
    .eq("project_id", parsed.data.projectId);

  const { data: existing } = await (
    parsed.data.bidId
      ? baseQuery.eq("bid_id", parsed.data.bidId)
      : baseQuery.is("bid_id", null)
  ).maybeSingle();

  let result;
  if (existing) {
    result = await supabase
      .from("user_notes")
      .update({ body: parsed.data.body, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    result = await supabase
      .from("user_notes")
      .insert({
        user_id: user.id,
        project_id: parsed.data.projectId,
        bid_id: parsed.data.bidId,
        body: parsed.data.body,
      })
      .select()
      .single();
  }

  if (result.error || !result.data) {
    console.error("[upsertNote]", result.error);
    return { success: false, error: "Failed to save note." };
  }

  return { success: true, data: result.data as UserNote };
}

export async function getProjectNotes(
  projectId: string
): Promise<ActionResult<UserNote[]>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("user_notes")
    .select("*")
    .eq("user_id", user.id)
    .eq("project_id", projectId);

  if (error) {
    console.error("[getProjectNotes]", error);
    return { success: false, error: "Failed to load notes." };
  }

  return { success: true, data: (data ?? []) as UserNote[] };
}
