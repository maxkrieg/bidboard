import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendInviteEmail,
  sendBidAddedEmail,
  sendCommentAddedEmail,
  sendMessageAddedEmail,
  sendAnalysisReadyEmail,
} from "@/lib/resend";

const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const bodySchema = z.object({
  type: z.enum([
    "invite",
    "bid_added",
    "comment_added",
    "message_added",
    "analysis_ready",
  ]),
  project_id: z.string().uuid(),
  triggered_by: z.string().uuid(),
  reference_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: Request) {
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { type, project_id, triggered_by, reference_id, metadata } =
    parsed.data;

  const admin = createAdminClient();

  // Fetch project + owner
  const { data: project } = await admin
    .from("projects")
    .select("name, owner_id, description")
    .eq("id", project_id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fetch owner user
  const { data: ownerUser } = await admin
    .from("users")
    .select("id, email, full_name")
    .eq("id", project.owner_id)
    .single();

  // Fetch accepted collaborators with user info
  const { data: collaborators } = await admin
    .from("project_collaborators")
    .select("user_id, invited_email, users(id, email, full_name)")
    .eq("project_id", project_id)
    .eq("status", "accepted");

  // Fetch triggered_by user info
  const { data: triggeredByUser } = await admin
    .from("users")
    .select("id, email, full_name")
    .eq("id", triggered_by)
    .single();

  const triggeredByName =
    triggeredByUser?.full_name ?? triggeredByUser?.email ?? "Someone";

  // Build full member list (owner + accepted collaborators)
  type Member = { id: string; email: string };
  const members: Member[] = [];

  if (ownerUser) {
    members.push({ id: ownerUser.id, email: ownerUser.email });
  }

  if (collaborators) {
    for (const c of collaborators) {
      const u = c.users as { id: string; email: string } | null;
      if (u) {
        members.push({ id: u.id, email: u.email });
      }
    }
  }

  // Recipients exclude the person who triggered the action
  const recipients = members.filter((m) => m.id !== triggered_by);

  if (type === "invite") {
    // For invites, recipient is just the invited email
    const invitedEmail = metadata?.invited_email;
    const inviteToken = metadata?.invite_token;
    if (!invitedEmail || !inviteToken) {
      return NextResponse.json(
        { error: "Missing invite metadata" },
        { status: 400 }
      );
    }

    await sendInviteEmail(
      invitedEmail,
      triggeredByName,
      project.name,
      inviteToken
    );

    // Insert notification for the invited user (if they already exist in users table)
    const { data: existingUser } = await admin
      .from("users")
      .select("id")
      .eq("email", invitedEmail)
      .single();

    if (existingUser) {
      await admin.from("notifications").insert({
        user_id: existingUser.id,
        project_id,
        type,
        reference_id: reference_id ?? null,
        read: false,
      });
    }

    return NextResponse.json({ success: true });
  }

  // For all other types, notify all recipients
  const recipientEmails = recipients.map((r) => r.email);

  // Debounce check for comment_added / message_added
  let shouldSendEmail = true;
  if (type === "comment_added" || type === "message_added") {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const debounceChecks = recipients.map(async (r) => {
      const { count } = await admin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", r.id)
        .eq("type", type)
        .eq("project_id", project_id)
        .gte("created_at", tenMinutesAgo);
      return (count ?? 0) > 0;
    });
    const results = await Promise.all(debounceChecks);
    // If all recipients already have a recent notification, skip email
    if (results.length > 0 && results.every(Boolean)) {
      shouldSendEmail = false;
    }
  }

  if (shouldSendEmail) {
    if (type === "bid_added") {
      const bidUrl = reference_id
        ? `${appUrl}/projects/${project_id}/bids/${reference_id}`
        : `${appUrl}/projects/${project_id}`;
      await sendBidAddedEmail(
        recipientEmails,
        triggeredByName,
        project.name,
        metadata?.contractor_name ?? "Unknown Contractor",
        metadata?.amount ?? "0",
        bidUrl
      );
    } else if (type === "comment_added") {
      const commentUrl = reference_id
        ? `${appUrl}/projects/${project_id}/bids/${reference_id}`
        : `${appUrl}/projects/${project_id}`;
      await sendCommentAddedEmail(
        recipientEmails,
        triggeredByName,
        project.name,
        metadata?.comment_excerpt ?? "",
        commentUrl
      );
    } else if (type === "message_added") {
      const projectUrl = `${appUrl}/projects/${project_id}`;
      await sendMessageAddedEmail(
        recipientEmails,
        triggeredByName,
        project.name,
        metadata?.message_excerpt ?? "",
        projectUrl
      );
    } else if (type === "analysis_ready") {
      const projectUrl = `${appUrl}/projects/${project_id}`;
      await sendAnalysisReadyEmail(recipientEmails, project.name, projectUrl);
    }
  }

  // Insert notification rows for each recipient
  if (recipients.length > 0) {
    await admin.from("notifications").insert(
      recipients.map((r) => ({
        user_id: r.id,
        project_id,
        type,
        reference_id: reference_id ?? null,
        read: false,
      }))
    );
  }

  return NextResponse.json({ success: true });
}
