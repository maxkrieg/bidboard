"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineItemsTable, type LineItemInput } from "./LineItemsTable";
import { BidDocuments } from "./BidDocuments";
import { DocumentUploadZone } from "./DocumentUploadZone";
import { AutoFillIndicator } from "./AutoFillIndicator";
import { createBid, updateBid } from "@/actions/bids";
import { GoogleBusinessConfirmationModal } from "./GoogleBusinessConfirmationModal";
import type { BidWithMeta, ActionResult, BidExtractionResult } from "@/types";

type PreviousContractor = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  location: string | null;
};

interface BidFormProps {
  projectId: string;
  projectLocation: string;
  bid?: BidWithMeta;
  previousContractors?: PreviousContractor[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function BidForm({ projectId, projectLocation, bid, previousContractors }: BidFormProps) {
  const router = useRouter();
  const isEdit = !!bid;

  const action = isEdit
    ? updateBid.bind(null, bid.id)
    : createBid.bind(null, projectId);

  type BidActionData = { id: string; contractorId: string; contractorName: string; hasGoogleData: boolean };

  const [state, formAction, isPending] = useActionState<
    ActionResult<BidActionData> | null,
    FormData
  >(action, null);

  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const [fieldValues, setFieldValues] = useState({
    contractor_name: bid?.contractor.name ?? "",
    contractor_phone: bid?.contractor.phone ?? "",
    contractor_email: bid?.contractor.email ?? "",
    contractor_website: bid?.contractor.website ?? "",
    contractor_location: bid?.contractor.location ?? projectLocation,
    total_price: bid?.total_price?.toString() ?? "",
    bid_date: bid?.bid_date ?? "",
    expiry_date: bid?.expiry_date ?? "",
    estimated_days: bid?.estimated_days?.toString() ?? "",
    notes: bid?.notes ?? "",
  });

  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(
    new Set()
  );
  const [extractionResult, setExtractionResult] =
    useState<BidExtractionResult | null>(null);
  const [tempStoragePath, setTempStoragePath] = useState<string | null>(null);
  const [tempFilename, setTempFilename] = useState<string | null>(null);

  const [lineItems, setLineItems] = useState<LineItemInput[]>(
    bid?.line_items.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unit: li.unit ?? "",
      unit_price: li.unit_price,
    })) ?? []
  );

  // On success: for new bids without Google data, show the confirmation modal.
  // Otherwise redirect immediately.
  useEffect(() => {
    if (!state?.success) return;
    if (isEdit || state.data.hasGoogleData) {
      const path = isEdit
        ? `/projects/${projectId}/bids/${bid.id}`
        : `/projects/${projectId}/bids/${state.data.id}`;
      router.push(path);
    } else {
      setShowGoogleModal(true);
    }
  }, [state, isEdit, projectId, bid?.id, router]);

  function updateField(name: keyof typeof fieldValues, value: string) {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
    setAutoFilledFields((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }

  function handleExtraction(result: BidExtractionResult, filename: string, tempPath: string | null) {
    setTempStoragePath(tempPath);
    setTempFilename(filename);
    const updates: Partial<typeof fieldValues> = {};
    const filled = new Set<string>();

    if (result.contractor.name) {
      updates.contractor_name = result.contractor.name;
      filled.add("contractor_name");
    }
    if (result.contractor.phone) {
      updates.contractor_phone = result.contractor.phone;
      filled.add("contractor_phone");
    }
    if (result.contractor.email) {
      updates.contractor_email = result.contractor.email;
      filled.add("contractor_email");
    }
    if (result.contractor.website) {
      updates.contractor_website = result.contractor.website;
      filled.add("contractor_website");
    }
    if (result.contractor.address) {
      updates.contractor_location = result.contractor.address;
      filled.add("contractor_location");
    }
    if (result.bid.total_price != null) {
      updates.total_price = String(result.bid.total_price);
      filled.add("total_price");
    }
    if (result.bid.bid_date) {
      updates.bid_date = result.bid.bid_date;
      filled.add("bid_date");
    }
    if (result.bid.expiry_date) {
      updates.expiry_date = result.bid.expiry_date;
      filled.add("expiry_date");
    }
    if (result.bid.estimated_days != null) {
      updates.estimated_days = String(result.bid.estimated_days);
      filled.add("estimated_days");
    }
    if (result.bid.notes) {
      updates.notes = result.bid.notes;
      filled.add("notes");
    }
    if (result.line_items.length > 0) {
      setLineItems(
        result.line_items.map((li) => ({
          description: li.description,
          quantity: li.quantity ?? 1,
          unit: li.unit ?? "",
          unit_price: li.unit_price ?? 0,
        }))
      );
      filled.add("line_items");
    }

    setFieldValues((prev) => ({ ...prev, ...updates }));
    setAutoFilledFields(filled);
    setExtractionResult(result);
  }

  function handleContractorSelect(contractorId: string) {
    const c = previousContractors?.find((p) => p.id === contractorId);
    if (!c) return;
    setFieldValues((prev) => ({
      ...prev,
      contractor_name: c.name,
      contractor_phone: c.phone ?? "",
      contractor_email: c.email ?? "",
      contractor_website: c.website ?? "",
      contractor_location: c.location ?? prev.contractor_location,
    }));
  }

  const lineItemsSubtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const totalPrice = parseFloat(fieldValues.total_price) || 0;
  const mismatch = Math.abs(lineItemsSubtotal - totalPrice) > 0.01;

  return (
    <>
    <form action={formAction} className="space-y-8 max-w-2xl">
      {/* Hidden serialized line items */}
      <input
        type="hidden"
        name="line_items"
        value={JSON.stringify(lineItems)}
      />

      {/* ── Document upload zone ────────────────────────────────────────── */}
      <DocumentUploadZone
        projectId={projectId}
        onExtracted={(result, filename, tempPath) => handleExtraction(result, filename, tempPath)}
        disabled={isPending}
      />
      {tempStoragePath && (
        <input type="hidden" name="temp_storage_path" value={tempStoragePath} />
      )}
      {tempFilename && (
        <input type="hidden" name="temp_document_filename" value={tempFilename} />
      )}

      {/* Low confidence warning */}
      {extractionResult?.confidence.overall === "low" && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">
            ⚠ We had trouble reading this document clearly. Please review all
            fields carefully.
          </p>
          <p className="mt-1 text-amber-700">
            {extractionResult.confidence.notes}
          </p>
        </div>
      )}

      {/* ── Contractor ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">
          Contractor
        </h2>
        {!isEdit && previousContractors && previousContractors.length > 0 && (
          <div className="space-y-1.5 mb-4">
            <Label htmlFor="previous_contractor">Previous Contractors</Label>
            <select
              id="previous_contractor"
              onChange={(e) => handleContractorSelect(e.target.value)}
              defaultValue=""
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="" disabled>Select a previous contractor…</option>
              {previousContractors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="text-xs text-zinc-400">Selecting will pre-fill the fields below.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="contractor_name">
              Name *
              {autoFilledFields.has("contractor_name") && <AutoFillIndicator />}
            </Label>
            <Input
              id="contractor_name"
              name="contractor_name"
              required
              value={fieldValues.contractor_name}
              onChange={(e) => updateField("contractor_name", e.target.value)}
              placeholder="ABC Roofing Co."
            />
          </div>
          <div>
            <Label htmlFor="contractor_phone">
              Phone
              {autoFilledFields.has("contractor_phone") && (
                <AutoFillIndicator />
              )}
            </Label>
            <Input
              id="contractor_phone"
              name="contractor_phone"
              type="tel"
              value={fieldValues.contractor_phone}
              onChange={(e) => updateField("contractor_phone", e.target.value)}
              placeholder="(555) 000-0000"
            />
          </div>
          <div>
            <Label htmlFor="contractor_email">
              Email
              {autoFilledFields.has("contractor_email") && (
                <AutoFillIndicator />
              )}
            </Label>
            <Input
              id="contractor_email"
              name="contractor_email"
              type="email"
              value={fieldValues.contractor_email}
              onChange={(e) => updateField("contractor_email", e.target.value)}
              placeholder="contact@contractor.com"
            />
          </div>
          <div>
            <Label htmlFor="contractor_website">
              Website
              {autoFilledFields.has("contractor_website") && (
                <AutoFillIndicator />
              )}
            </Label>
            <Input
              id="contractor_website"
              name="contractor_website"
              type="url"
              value={fieldValues.contractor_website}
              onChange={(e) =>
                updateField("contractor_website", e.target.value)
              }
              placeholder="https://contractor.com"
            />
          </div>
          <div>
            <Label htmlFor="contractor_location">
              Location
              {autoFilledFields.has("contractor_location") && (
                <AutoFillIndicator />
              )}
            </Label>
            <Input
              id="contractor_location"
              name="contractor_location"
              value={fieldValues.contractor_location}
              onChange={(e) =>
                updateField("contractor_location", e.target.value)
              }
              placeholder="City, ST"
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* ── Bid Details ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">
          Bid Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="total_price">
              Total Price *
              {autoFilledFields.has("total_price") && <AutoFillIndicator />}
            </Label>
            <Input
              id="total_price"
              name="total_price"
              type="number"
              min="0"
              step="0.01"
              required
              value={fieldValues.total_price}
              onChange={(e) => updateField("total_price", e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="bid_date">
              Bid Date *
              {autoFilledFields.has("bid_date") && <AutoFillIndicator />}
            </Label>
            <Input
              id="bid_date"
              name="bid_date"
              type="date"
              required
              value={fieldValues.bid_date}
              onChange={(e) => updateField("bid_date", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="expiry_date">
              Expiry Date
              {autoFilledFields.has("expiry_date") && <AutoFillIndicator />}
            </Label>
            <Input
              id="expiry_date"
              name="expiry_date"
              type="date"
              value={fieldValues.expiry_date}
              onChange={(e) => updateField("expiry_date", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="estimated_days">
              Estimated Days
              {autoFilledFields.has("estimated_days") && <AutoFillIndicator />}
            </Label>
            <Input
              id="estimated_days"
              name="estimated_days"
              type="number"
              min="1"
              step="1"
              value={fieldValues.estimated_days}
              onChange={(e) => updateField("estimated_days", e.target.value)}
              placeholder="14"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">
              Notes
              {autoFilledFields.has("notes") && <AutoFillIndicator />}
            </Label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={fieldValues.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Any additional details about this bid..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* ── Line Items ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">
          Line Items
          {autoFilledFields.has("line_items") && <AutoFillIndicator />}
        </h2>

        {mismatch && lineItems.length > 0 && (
          <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            Line items subtotal ({formatCurrency(lineItemsSubtotal)}) does not
            match total price ({formatCurrency(totalPrice)}). Update the total
            price or adjust the line items.
          </div>
        )}

        <LineItemsTable items={lineItems} onChange={setLineItems} />
      </section>

      {/* ── Documents (edit mode only) ──────────────────────────────────── */}
      {isEdit && bid && (
        <>
          <Separator />
          <section>
            <h2 className="text-base font-semibold text-zinc-900 mb-4">
              Documents
            </h2>
            <BidDocuments
              bidId={bid.id}
              projectId={projectId}
              documents={bid.documents}
            />
          </section>
        </>
      )}

      {/* ── Error + Submit ───────────────────────────────────────────────── */}
      {state && !state.success && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : isEdit ? "Update Bid" : "Add Bid"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>

    {showGoogleModal && state?.success && (
      <GoogleBusinessConfirmationModal
        contractorId={state.data.contractorId}
        contractorName={state.data.contractorName}
        projectLocation={projectLocation}
        onDone={() => {
          setShowGoogleModal(false);
          router.push(`/projects/${projectId}/bids/${state.data.id}`);
        }}
      />
    )}
    </>
  );
}
