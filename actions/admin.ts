"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAccessApprovedEmail } from "@/lib/resend";
import type { ActionResult } from "@/types";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function assertAdmin(): Promise<string> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error("Unauthorized");
  }
  return user.id;
}

export async function approveUser(userId: string): Promise<void> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  const { error } = await admin
    .from("users")
    .update({ status: "approved" })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  if (profile) {
    await sendAccessApprovedEmail(profile.email, siteUrl);
  }

  revalidatePath("/admin");
}

export async function rejectUser(userId: string): Promise<void> {
  await assertAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("users")
    .update({ status: "rejected" })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function removeUser(userId: string): Promise<void> {
  await assertAdmin();
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

const addUserSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

export async function addUser(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  try {
    await assertAdmin();
    const admin = createAdminClient();

    const parsed = addUserSchema.safeParse({ email: formData.get("email") });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const { email } = parsed.data;

    // Check if user already exists
    const { data: existing } = await admin
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    if (existing) {
      return {
        success: false,
        error: "A user with this email already exists.",
      };
    }

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
    if (error) return { success: false, error: error.message };

    // Immediately approve — admin is proactively adding this user
    await admin
      .from("users")
      .update({ status: "approved", notification_sent: true })
      .eq("id", data.user.id);

    revalidatePath("/admin");
    return { success: true, data: null };
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return { success: false, error: "Unauthorized." };
    }
    console.error("[admin] addUser error:", err);
    return { success: false, error: "Failed to add user." };
  }
}
