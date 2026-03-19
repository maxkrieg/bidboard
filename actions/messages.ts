"use server";

import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import type { ActionResult, Message } from "@/types";

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const MessageBodySchema = z.object({
  body: z.string().min(1, "Message cannot be empty").max(2000, "Message too long"),
});

// ── createMessage ─────────────────────────────────────────────────────────────

export async function createMessage(
  projectId: string,
  body: string
): Promise<ActionResult<Message>> {
  const parsed = MessageBodySchema.safeParse({ body });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      project_id: projectId,
      author_id: user.id,
      body: parsed.data.body,
    })
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Failed to send message" };
  }

  return { success: true, data: data as Message };
}
