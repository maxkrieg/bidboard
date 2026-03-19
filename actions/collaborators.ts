"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { signInviteToken, verifyInviteToken } from "@/lib/jwt";
import type { ActionResult } from "@/types";

const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const InviteSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function inviteCollaborator(
  projectId: string,
  email: string
): Promise<ActionResult<null>> {
  const parsed = InviteSchema.safeParse({ email });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const normalizedEmail = parsed.data.email.toLowerCase();

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Assert caller is project owner
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id, name")
    .eq("id", projectId)
    .single();

  if (!project) return { success: false, error: "Project not found." };
  if (project.owner_id !== user.id) {
    return { success: false, error: "Only the project owner can invite collaborators." };
  }

  // Check collaborator limit (max 3)
  const { count: collabCount } = await supabase
    .from("project_collaborators")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if ((collabCount ?? 0) >= 3) {
    return { success: false, error: "Maximum of 3 collaborators reached." };
  }

  // Check not already an accepted collaborator or pending invite
  const { data: existing } = await supabase
    .from("project_collaborators")
    .select("id, status")
    .eq("project_id", projectId)
    .ilike("invited_email", normalizedEmail)
    .maybeSingle();

  if (existing) {
    if (existing.status === "accepted") {
      return { success: false, error: "This person is already a collaborator." };
    }
    return { success: false, error: "An invite has already been sent to this email." };
  }

  // Upsert project_collaborators row
  const { error: insertError } = await supabase
    .from("project_collaborators")
    .insert({
      project_id: projectId,
      invited_email: normalizedEmail,
      status: "pending",
    });

  if (insertError) {
    console.error("[inviteCollaborator] insert", insertError);
    return { success: false, error: "Failed to save invite." };
  }

  // Generate JWT invite token
  const token = await signInviteToken(projectId, normalizedEmail);

  // Fire notification (invite email) — best-effort
  try {
    await fetch(`${appUrl}/api/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
      },
      body: JSON.stringify({
        type: "invite",
        project_id: projectId,
        triggered_by: user.id,
        metadata: {
          invited_email: normalizedEmail,
          invite_token: token,
        },
      }),
    });
  } catch (err) {
    console.error("[inviteCollaborator] notification fetch failed", err);
  }

  return { success: true, data: null };
}

export async function acceptInvite(
  token: string
): Promise<ActionResult<{ projectId: string }>> {
  const payload = await verifyInviteToken(token);
  if (!payload) {
    return { success: false, error: "Invalid or expired invite link." };
  }

  const { projectId, invitedEmail } = payload;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to accept an invite." };
  }

  // Verify email matches
  if (user.email?.toLowerCase() !== invitedEmail.toLowerCase()) {
    return {
      success: false,
      error: `This invite was sent to ${invitedEmail}. Please sign in with that email address.`,
    };
  }

  // Find the pending invite
  const { data: invite } = await supabase
    .from("project_collaborators")
    .select("id, status")
    .eq("project_id", projectId)
    .ilike("invited_email", invitedEmail)
    .maybeSingle();

  if (!invite) {
    return { success: false, error: "Invite not found." };
  }

  if (invite.status === "accepted") {
    return { success: true, data: { projectId } };
  }

  const { error } = await supabase
    .from("project_collaborators")
    .update({ user_id: user.id, status: "accepted" })
    .eq("id", invite.id);

  if (error) {
    console.error("[acceptInvite] update", error);
    return { success: false, error: "Failed to accept invite." };
  }

  return { success: true, data: { projectId } };
}
