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

  // Fire message_added notification — best-effort, non-blocking
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await fetch(`${baseUrl}/api/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
      },
      body: JSON.stringify({
        type: "message_added",
        project_id: projectId,
        triggered_by: user.id,
        metadata: {
          message_excerpt: parsed.data.body.slice(0, 100),
        },
      }),
    }).catch(() => {});
  } catch (e) {
    console.error("[createMessage] notification fetch failed", e);
  }

  return { success: true, data: data as Message };
}
