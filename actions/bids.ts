"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult, Bid, BidStatus, BidWithMeta } from "@/types";

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const LineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unit: z.string().optional(),
  unit_price: z.coerce.number().min(0, "Unit price must be non-negative"),
});

const ContractorSchema = z.object({
  name: z.string().min(1, "Contractor name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  location: z.string().optional(),
});

const BidSchema = z.object({
  contractor: ContractorSchema,
  total_price: z.coerce.number().positive("Total price must be positive"),
  bid_date: z.string().min(1, "Bid date is required"),
  expiry_date: z.string().optional().or(z.literal("")),
  estimated_days: z.coerce.number().int().positive().optional(),
  notes: z.string().optional(),
  line_items: z.array(LineItemSchema).default([]),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function assertProjectMember(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  projectId: string,
  userId: string
): Promise<boolean> {
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (project?.owner_id === userId) return true;

  const { data: collab } = await supabase
    .from("project_collaborators")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .single();

  return !!collab;
}

async function getBidProjectId(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  bidId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("bids")
    .select("project_id")
    .eq("id", bidId)
    .single();
  return data?.project_id ?? null;
}

// ── createBid ─────────────────────────────────────────────────────────────────

export async function createBid(
  projectId: string,
  _prevState: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isMember = await assertProjectMember(supabase, projectId, user.id);
  if (!isMember) return { success: false, error: "Not authorized." };

  // Fetch project location for contractor enrichment
  const { data: project } = await supabase
    .from("projects")
    .select("location")
    .eq("id", projectId)
    .single();

  let lineItemsRaw: unknown = [];
  try {
    const raw = formData.get("line_items");
    lineItemsRaw = raw ? JSON.parse(raw as string) : [];
  } catch {
    return { success: false, error: "Invalid line items data." };
  }

  const parsed = BidSchema.safeParse({
    contractor: {
      name: formData.get("contractor_name"),
      phone: formData.get("contractor_phone") || undefined,
      email: formData.get("contractor_email") || undefined,
      website: formData.get("contractor_website") || undefined,
      location: formData.get("contractor_location") || undefined,
    },
    total_price: formData.get("total_price"),
    bid_date: formData.get("bid_date"),
    expiry_date: formData.get("expiry_date") || undefined,
    estimated_days: formData.get("estimated_days") || undefined,
    notes: formData.get("notes") || undefined,
    line_items: lineItemsRaw,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { contractor: contractorData, line_items, ...bidData } = parsed.data;

  // Upsert contractor by normalized name
  const { data: existingContractor } = await supabase
    .from("contractors")
    .select("id")
    .ilike("name", contractorData.name)
    .maybeSingle();

  let contractorId: string;

  if (existingContractor) {
    contractorId = existingContractor.id;
  } else {
    // Insert via admin client (anon role cannot insert contractors)
    const admin = createAdminClient();
    const { data: newContractor, error: contractorError } = await admin
      .from("contractors")
      .insert({
        name: contractorData.name,
        phone: contractorData.phone ?? null,
        email: contractorData.email || null,
        website: contractorData.website || null,
        location: contractorData.location ?? null,
      })
      .select("id")
      .single();

    if (contractorError || !newContractor) {
      console.error("[createBid] contractor insert", contractorError);
      return { success: false, error: "Failed to save contractor." };
    }
    contractorId = newContractor.id;
  }

  // Insert bid
  const { data: bid, error: bidError } = await supabase
    .from("bids")
    .insert({
      project_id: projectId,
      contractor_id: contractorId,
      total_price: bidData.total_price,
      bid_date: bidData.bid_date,
      expiry_date: bidData.expiry_date || null,
      estimated_days: bidData.estimated_days ?? null,
      notes: bidData.notes ?? null,
    })
    .select("id")
    .single();

  if (bidError || !bid) {
    console.error("[createBid] bid insert", bidError);
    return { success: false, error: "Failed to save bid." };
  }

  // Insert line items
  if (line_items.length > 0) {
    const { error: liError } = await supabase.from("bid_line_items").insert(
      line_items.map((item) => ({
        bid_id: bid.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit ?? null,
        unit_price: item.unit_price,
      }))
    );
    if (liError) console.error("[createBid] line_items insert", liError);
  }

  // Fire enrichment — best-effort, non-blocking
  // Consider just defined as function in this file rather than self-referencing API route
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    fetch(`${baseUrl}/api/enrich-contractor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
      },
      body: JSON.stringify({
        contractorId,
        projectLocation: project?.location ?? "",
      }),
    }).catch(() => {});
  } catch {
    // non-blocking
  }

  return { success: true, data: { id: bid.id } };
}

// ── updateBid ─────────────────────────────────────────────────────────────────

export async function updateBid(
  bidId: string,
  _prevState: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const projectId = await getBidProjectId(supabase, bidId);
  if (!projectId) return { success: false, error: "Bid not found." };

  const isMember = await assertProjectMember(supabase, projectId, user.id);
  if (!isMember) return { success: false, error: "Not authorized." };

  let lineItemsRaw: unknown = [];
  try {
    const raw = formData.get("line_items");
    lineItemsRaw = raw ? JSON.parse(raw as string) : [];
  } catch {
    return { success: false, error: "Invalid line items data." };
  }

  const parsed = BidSchema.safeParse({
    contractor: {
      name: formData.get("contractor_name"),
      phone: formData.get("contractor_phone") || undefined,
      email: formData.get("contractor_email") || undefined,
      website: formData.get("contractor_website") || undefined,
      location: formData.get("contractor_location") || undefined,
    },
    total_price: formData.get("total_price"),
    bid_date: formData.get("bid_date"),
    expiry_date: formData.get("expiry_date") || undefined,
    estimated_days: formData.get("estimated_days") || undefined,
    notes: formData.get("notes") || undefined,
    line_items: lineItemsRaw,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { contractor: contractorData, line_items, ...bidData } = parsed.data;

  // Get or create contractor
  const { data: existingContractor } = await supabase
    .from("contractors")
    .select("id")
    .ilike("name", contractorData.name)
    .maybeSingle();

  let contractorId: string;

  if (existingContractor) {
    contractorId = existingContractor.id;
  } else {
    const admin = createAdminClient();
    const { data: newContractor, error: contractorError } = await admin
      .from("contractors")
      .insert({
        name: contractorData.name,
        phone: contractorData.phone ?? null,
        email: contractorData.email || null,
        website: contractorData.website || null,
        location: contractorData.location ?? null,
      })
      .select("id")
      .single();

    if (contractorError || !newContractor) {
      return { success: false, error: "Failed to save contractor." };
    }
    contractorId = newContractor.id;
  }

  // Update bid
  const { error: bidError } = await supabase
    .from("bids")
    .update({
      contractor_id: contractorId,
      total_price: bidData.total_price,
      bid_date: bidData.bid_date,
      expiry_date: bidData.expiry_date || null,
      estimated_days: bidData.estimated_days ?? null,
      notes: bidData.notes ?? null,
    })
    .eq("id", bidId);

  if (bidError) {
    console.error("[updateBid]", bidError);
    return { success: false, error: "Failed to update bid." };
  }

  // Replace line items
  await supabase.from("bid_line_items").delete().eq("bid_id", bidId);

  if (line_items.length > 0) {
    await supabase.from("bid_line_items").insert(
      line_items.map((item) => ({
        bid_id: bidId,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit ?? null,
        unit_price: item.unit_price,
      }))
    );
  }

  return { success: true, data: { id: bidId } };
}

// ── deleteBid ─────────────────────────────────────────────────────────────────

export async function deleteBid(bidId: string): Promise<void> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const projectId = await getBidProjectId(supabase, bidId);
  if (!projectId) redirect("/dashboard");

  const isMember = await assertProjectMember(supabase, projectId, user.id);
  if (!isMember) redirect("/dashboard");

  // Delete documents from storage
  const { data: docs } = await supabase
    .from("bid_documents")
    .select("storage_path")
    .eq("bid_id", bidId);

  if (docs && docs.length > 0) {
    const admin = createAdminClient();
    await admin.storage
      .from("bid-documents")
      .remove(docs.map((d) => d.storage_path));
  }

  await supabase.from("bids").delete().eq("id", bidId);

  redirect(`/projects/${projectId}`);
}

// ── updateBidStatus ───────────────────────────────────────────────────────────

export async function updateBidStatus(
  bidId: string,
  status: BidStatus
): Promise<ActionResult<{ id: string; otherBidIds?: string[] }>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const projectId = await getBidProjectId(supabase, bidId);
  if (!projectId) return { success: false, error: "Bid not found." };

  const isMember = await assertProjectMember(supabase, projectId, user.id);
  if (!isMember) return { success: false, error: "Not authorized." };

  const { error } = await supabase
    .from("bids")
    .update({ status })
    .eq("id", bidId);

  if (error) {
    console.error("[updateBidStatus]", error);
    return { success: false, error: "Failed to update status." };
  }

  if (status === "accepted") {
    const { data: others } = await supabase
      .from("bids")
      .select("id")
      .eq("project_id", projectId)
      .neq("id", bidId);

    const otherBidIds = (others ?? []).map((b) => b.id);
    return { success: true, data: { id: bidId, otherBidIds } };
  }

  return { success: true, data: { id: bidId } };
}

// ── rejectOtherBids ───────────────────────────────────────────────────────────

export async function rejectOtherBids(
  projectId: string,
  acceptedBidId: string
): Promise<ActionResult<null>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isMember = await assertProjectMember(supabase, projectId, user.id);
  if (!isMember) return { success: false, error: "Not authorized." };

  const { error } = await supabase
    .from("bids")
    .update({ status: "rejected" })
    .eq("project_id", projectId)
    .neq("id", acceptedBidId);

  if (error) {
    console.error("[rejectOtherBids]", error);
    return { success: false, error: "Failed to reject other bids." };
  }

  return { success: true, data: null };
}

// ── uploadBidDocument ─────────────────────────────────────────────────────────

export async function uploadBidDocument(
  bidId: string,
  projectId: string,
  formData: FormData
): Promise<ActionResult<{ id: string; filename: string }>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isMember = await assertProjectMember(supabase, projectId, user.id);
  if (!isMember) return { success: false, error: "Not authorized." };

  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "No file provided." };

  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: "File must be under 10MB." };
  }

  const ext = file.name.split(".").pop();
  const storagePath = `${projectId}/${bidId}/${Date.now()}.${ext}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("bid-documents")
    .upload(storagePath, file, { upsert: false });

  if (uploadError) {
    console.error("[uploadBidDocument] storage", uploadError);
    return { success: false, error: "Upload failed." };
  }

  const { data: doc, error: dbError } = await supabase
    .from("bid_documents")
    .insert({ bid_id: bidId, filename: file.name, storage_path: storagePath })
    .select("id, filename")
    .single();

  if (dbError || !doc) {
    console.error("[uploadBidDocument] db", dbError);
    return { success: false, error: "Failed to record document." };
  }

  return { success: true, data: { id: doc.id, filename: doc.filename } };
}

// ── deleteBidDocument ─────────────────────────────────────────────────────────

export async function deleteBidDocument(
  documentId: string,
  projectId: string
): Promise<ActionResult<null>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isMember = await assertProjectMember(supabase, projectId, user.id);
  if (!isMember) return { success: false, error: "Not authorized." };

  const { data: doc } = await supabase
    .from("bid_documents")
    .select("storage_path")
    .eq("id", documentId)
    .single();

  if (!doc) return { success: false, error: "Document not found." };

  const admin = createAdminClient();
  await admin.storage.from("bid-documents").remove([doc.storage_path]);

  const { error } = await supabase
    .from("bid_documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    console.error("[deleteBidDocument]", error);
    return { success: false, error: "Failed to delete document." };
  }

  return { success: true, data: null };
}

// ── getBidById ────────────────────────────────────────────────────────────────

export async function getBidById(
  bidId: string
): Promise<ActionResult<BidWithMeta>> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("bids")
    .select(
      `
      *,
      contractor:contractors (*),
      line_items:bid_line_items (*),
      documents:bid_documents (*)
    `
    )
    .eq("id", bidId)
    .single();

  if (error || !data) {
    return { success: false, error: "Bid not found." };
  }

  return {
    success: true,
    data: data as unknown as BidWithMeta,
  };
}
