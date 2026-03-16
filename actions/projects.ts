"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import type { ActionResult, Project, ProjectWithMeta } from "@/types";

// ---- Zod Schemas ----

const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(1000).optional(),
  location: z.string().min(1, "Location is required").max(200),
  target_budget: z.preprocess(
    (val) =>
      val === "" || val === null || val === undefined ? undefined : Number(val),
    z.number().positive().optional()
  ),
  target_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});

// ---- Actions ----

export async function createProject(
  _prevState: ActionResult<Project> | null,
  formData: FormData
): Promise<ActionResult<Project>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = CreateProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    location: formData.get("location"),
    target_budget: formData.get("target_budget"),
    target_date: formData.get("target_date"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      location: parsed.data.location,
      target_budget: parsed.data.target_budget ?? null,
      target_date: parsed.data.target_date || null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[createProject]", error);
    return { success: false, error: "Failed to create project." };
  }

  redirect(`/projects/${data.id}`);
}

export async function archiveProject(
  projectId: string
): Promise<ActionResult<null>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (!project || project.owner_id !== user.id) {
    return { success: false, error: "Not authorized." };
  }

  const { error } = await supabase
    .from("projects")
    .update({ status: "archived" })
    .eq("id", projectId);

  if (error) {
    console.error("[archiveProject]", error);
    return { success: false, error: "Failed to archive project." };
  }

  return { success: true, data: null };
}

export async function getProjectById(
  projectId: string
): Promise<ActionResult<ProjectWithMeta>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("projects")
    .select(
      `
      *,
      collaborators:project_collaborators (
        *,
        users ( full_name, email, avatar_url )
      ),
      bids (
        *,
        contractor:contractors (*),
        line_items:bid_line_items (*),
        documents:bid_documents (*)
      )
    `
    )
    .eq("id", projectId)
    .single();

  if (error || !data) {
    return { success: false, error: "Project not found." };
  }

  const bids = (data.bids as unknown as ProjectWithMeta["bids"]) ?? [];

  return {
    success: true,
    data: {
      ...data,
      status: data.status as "active" | "archived",
      collaborators: (
        data.collaborators as unknown as ProjectWithMeta["collaborators"]
      ),
      bid_count: bids.length,
      bids,
    },
  };
}
