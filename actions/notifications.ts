"use server";

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/types";

export async function markNotificationRead(
  notificationId: string
): Promise<ActionResult<null>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[markNotificationRead]", error);
    return { success: false, error: "Failed to mark notification read." };
  }

  return { success: true, data: null };
}

export async function markAllNotificationsRead(): Promise<ActionResult<null>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) {
    console.error("[markAllNotificationsRead]", error);
    return { success: false, error: "Failed to mark notifications read." };
  }

  return { success: true, data: null };
}
