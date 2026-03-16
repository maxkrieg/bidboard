"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineItemsTable, type LineItemInput } from "./LineItemsTable";
import { BidDocuments } from "./BidDocuments";
import { createBid, updateBid } from "@/actions/bids";
import type { BidWithMeta, ActionResult } from "@/types";

interface BidFormProps {
  projectId: string;
  projectLocation: string;
  bid?: BidWithMeta;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function BidForm({ projectId, projectLocation, bid }: BidFormProps) {
  const router = useRouter();
  const isEdit = !!bid;

  const action = isEdit
    ? updateBid.bind(null, bid.id)
    : createBid.bind(null, projectId);

  const [state, formAction, isPending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  const [lineItems, setLineItems] = useState<LineItemInput[]>(
    bid?.line_items.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unit: li.unit ?? "",
      unit_price: li.unit_price,
    })) ?? []
  );

  const [totalPriceValue, setTotalPriceValue] = useState(
    bid?.total_price?.toString() ?? ""
  );

  // Redirect on success
  useEffect(() => {
    if (state?.success) {
      if (isEdit) {
        router.push(`/projects/${projectId}/bids/${bid.id}`);
      } else {
        router.push(`/projects/${projectId}/bids/${state.data.id}`);
      }
    }
  }, [state, isEdit, projectId, bid?.id, router]);

  const lineItemsSubtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const totalPrice = parseFloat(totalPriceValue) || 0;
  const mismatch = Math.abs(lineItemsSubtotal - totalPrice) > 0.01;

  return (
    <form action={formAction} className="space-y-8 max-w-2xl">
      {/* Hidden serialized line items */}
      <input
        type="hidden"
        name="line_items"
        value={JSON.stringify(lineItems)}
      />

      {/* ── Contractor ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-zinc-900 mb-4">
          Contractor
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="contractor_name">Name *</Label>
            <Input
              id="contractor_name"
              name="contractor_name"
              required
              defaultValue={bid?.contractor.name ?? ""}
              placeholder="ABC Roofing Co."
            />
          </div>
          <div>
            <Label htmlFor="contractor_phone">Phone</Label>
            <Input
              id="contractor_phone"
              name="contractor_phone"
              type="tel"
              defaultValue={bid?.contractor.phone ?? ""}
              placeholder="(555) 000-0000"
            />
          </div>
          <div>
            <Label htmlFor="contractor_email">Email</Label>
            <Input
              id="contractor_email"
              name="contractor_email"
              type="email"
              defaultValue={bid?.contractor.email ?? ""}
              placeholder="contact@contractor.com"
            />
          </div>
          <div>
            <Label htmlFor="contractor_website">Website</Label>
            <Input
              id="contractor_website"
              name="contractor_website"
              type="url"
              defaultValue={bid?.contractor.website ?? ""}
              placeholder="https://contractor.com"
            />
          </div>
          <div>
            <Label htmlFor="contractor_location">Location</Label>
            <Input
              id="contractor_location"
              name="contractor_location"
              defaultValue={bid?.contractor.location ?? projectLocation}
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
            <Label htmlFor="total_price">Total Price *</Label>
            <Input
              id="total_price"
              name="total_price"
              type="number"
              min="0"
              step="0.01"
              required
              value={totalPriceValue}
              onChange={(e) => setTotalPriceValue(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="bid_date">Bid Date *</Label>
            <Input
              id="bid_date"
              name="bid_date"
              type="date"
              required
              defaultValue={bid?.bid_date ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="expiry_date">Expiry Date</Label>
            <Input
              id="expiry_date"
              name="expiry_date"
              type="date"
              defaultValue={bid?.expiry_date ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="estimated_days">Estimated Days</Label>
            <Input
              id="estimated_days"
              name="estimated_days"
              type="number"
              min="1"
              step="1"
              defaultValue={bid?.estimated_days ?? ""}
              placeholder="14"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={bid?.notes ?? ""}
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
  );
}
