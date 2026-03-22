import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractBidFromDocument } from "@/lib/claude";

const bodySchema = z.object({
  file_base64: z.string().min(1),
  media_type: z.enum([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]),
  project_id: z.string().uuid(),
  filename: z.string().min(1),
});

const extMap: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { file_base64, media_type, project_id, filename } = parsed.data;

  // Verify project membership
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", project_id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const isMember =
    project.owner_id === user.id ||
    (await (async () => {
      const { data } = await supabase
        .from("project_collaborators")
        .select("id")
        .eq("project_id", project_id)
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();
      return !!data;
    })());

  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Upload file to temp storage path
  const ext = extMap[media_type] ?? "pdf";
  const tempStoragePath = `${project_id}/temp/${Date.now()}.${ext}`;
  const admin = createAdminClient();
  const fileBuffer = Buffer.from(file_base64, "base64");

  const { error: uploadError } = await admin.storage
    .from("bid-documents")
    .upload(tempStoragePath, fileBuffer, { contentType: media_type, upsert: false });

  if (uploadError) {
    console.error("[extract-bid] temp upload failed", uploadError);
    // Continue with extraction even if storage fails — don't block the user
  }

  try {
    const result = await extractBidFromDocument(file_base64, media_type);
    return NextResponse.json({
      success: true,
      data: result,
      temp_storage_path: uploadError ? null : tempStoragePath,
      temp_filename: filename,
    });
  } catch (err) {
    console.error("[extract-bid] extraction failed", err);
    // Clean up the temp file if extraction fails
    if (!uploadError) {
      await admin.storage.from("bid-documents").remove([tempStoragePath]);
    }
    return NextResponse.json(
      { success: false, error: "Extraction failed" },
      { status: 500 }
    );
  }
}
