import { createAdminClient } from "@/lib/supabase/admin";
import type { ActivityEventType } from "@/types";
import type { Json } from "@/lib/supabase/types";

export function triggerProjectSummary(projectId: string): void {
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  fetch(`${appUrl}/api/summarize-project`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
    },
    body: JSON.stringify({ project_id: projectId }),
  }).catch(() => {});
}

/**
 * Insert an activity log entry. Uses the service-role client since RLS
 * restricts inserts to service role only. All callers should wrap with
 * try/catch and not propagate errors — logging is best-effort.
 */
export async function logActivity(
  projectId: string,
  actorId: string,
  eventType: ActivityEventType,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("activity_log").insert({
    project_id: projectId,
    actor_id: actorId,
    event_type: eventType,
    payload: payload as unknown as Json,
  });
}
