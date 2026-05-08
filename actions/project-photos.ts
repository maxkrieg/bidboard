"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult, ProjectPhoto } from "@/types";

const BUCKET = "project-photos";
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function createPhotoUploadUrl(
  projectId: string,
  filename: string,
  contentType: string
): Promise<ActionResult<{ storagePath: string; token: string }>> {
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

  if (!ALLOWED_TYPES.includes(contentType)) {
    return { success: false, error: "Only JPEG, PNG, and WebP images are allowed." };
  }

  const ext = filename.split(".").pop() ?? "jpg";
  const storagePath = `${projectId}/${Date.now()}.${ext}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(storagePath);
  if (error || !data) {
    console.error("[createPhotoUploadUrl]", error);
    return { success: false, error: "Failed to prepare upload." };
  }

  return { success: true, data: { storagePath, token: data.token } };
}

export async function recordPhotoUpload(
  projectId: string,
  storagePath: string,
  filename: string
): Promise<ActionResult<ProjectPhoto>> {
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

  const { data, error: dbError } = await supabase
    .from("project_photos")
    .insert({ project_id: projectId, filename, storage_path: storagePath })
    .select()
    .single();
  if (dbError || !data) {
    const admin = createAdminClient();
    await admin.storage.from(BUCKET).remove([storagePath]);
    console.error("[recordPhotoUpload]", dbError);
    return { success: false, error: "Failed to save photo record." };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/edit`);
  revalidatePath("/dashboard");
  return { success: true, data: data as ProjectPhoto };
}

export async function deleteProjectPhoto(
  photoId: string
): Promise<ActionResult<null>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: photo } = await supabase
    .from("project_photos")
    .select("storage_path, project_id")
    .eq("id", photoId)
    .single();
  if (!photo) return { success: false, error: "Photo not found." };

  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([photo.storage_path]);

  const { error } = await supabase
    .from("project_photos")
    .delete()
    .eq("id", photoId);
  if (error) {
    console.error("[deleteProjectPhoto]", error);
    return { success: false, error: "Failed to delete photo." };
  }

  revalidatePath(`/projects/${photo.project_id}`);
  revalidatePath(`/projects/${photo.project_id}/edit`);
  revalidatePath("/dashboard");
  return { success: true, data: null };
}

export async function setBannerPhoto(
  projectId: string,
  photoId: string | null
): Promise<ActionResult<null>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("projects")
    .update({ banner_photo_id: photoId })
    .eq("id", projectId)
    .eq("owner_id", user.id);
  if (error) {
    console.error("[setBannerPhoto]", error);
    return { success: false, error: "Failed to update banner." };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/edit`);
  revalidatePath("/dashboard");
  return { success: true, data: null };
}

export async function updatePhotoCaption(
  photoId: string,
  caption: string
): Promise<ActionResult<null>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("project_photos")
    .update({ caption: caption.trim() || null })
    .eq("id", photoId);
  if (error) {
    console.error("[updatePhotoCaption]", error);
    return { success: false, error: "Failed to save caption." };
  }

  return { success: true, data: null };
}
