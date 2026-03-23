import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { getBidById } from "@/actions/bids";
import { createServerClient } from "@/lib/supabase/server";
import { ContractorCard } from "@/components/bids/ContractorCard";
import { LineItemsTable } from "@/components/bids/LineItemsTable";
import { BidDocuments } from "@/components/bids/BidDocuments";
import { BidStatusActions } from "@/components/bids/BidStatusActions";
import { BidRating } from "@/components/bids/BidRating";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DeleteBidButton } from "@/components/bids/DeleteBidButton";
import { CommentsPanel } from "@/components/comments/CommentsPanel";
import { Button } from "@/components/ui/button";
import type { CommentWithAuthor, BidRatingWithUser } from "@/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default async function BidDetailPage({
  params,
}: {
  params: Promise<{ id: string; bidId: string }>;
}) {
  const { id, bidId } = await params;
  const result = await getBidById(bidId);
  if (!result.success) notFound();

  const bid = result.data;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: initialComments } = await supabase
    .from("comments")
    .select("*, author:users(full_name, avatar_url, email)")
    .eq("bid_id", bidId)
    .order("created_at", { ascending: true });

  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", id)
    .single();
  const isOwner = project?.owner_id === user?.id;

  return (
    <div>
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 mb-6"
      >
        <ChevronLeft size={14} />
        Back to project
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {bid.contractor.name}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Bid submitted{" "}
            {new Date(bid.bid_date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/projects/${id}/bids/${bidId}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil size={13} className="mr-1.5" />
              Edit
            </Button>
          </Link>
          <DeleteBidButton bidId={bidId} />
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">
        {/* Left column */}
        <div className="space-y-6">
          <ContractorCard contractor={bid.contractor} />

          {/* Bid summary */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-zinc-900">
                Bid Summary
              </h3>
              <StatusBadge status={bid.status} />
            </div>
            <div className="mb-4">
              <p className="text-zinc-400 text-xs mb-0.5">Total Price</p>
              <p className="text-3xl font-bold text-zinc-900">
                {formatCurrency(bid.total_price)}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              {bid.estimated_days && (
                <div>
                  <p className="text-zinc-400 text-xs mb-0.5">Duration</p>
                  <p className="font-medium text-zinc-700">
                    {bid.estimated_days} days
                  </p>
                </div>
              )}
              {bid.expiry_date && (
                <div>
                  <p className="text-zinc-400 text-xs mb-0.5">Expires</p>
                  <p className="font-medium text-zinc-700">
                    {new Date(bid.expiry_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>
            {bid.notes && (
              <div className="mt-4 pt-4 border-t border-zinc-100">
                <p className="text-xs text-zinc-400 mb-1">Notes</p>
                <p className="text-sm text-zinc-600 whitespace-pre-line">
                  {bid.notes}
                </p>
              </div>
            )}
          </div>

          {/* Status actions */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="text-base font-semibold text-zinc-900 mb-3">
              Status
            </h3>
            <BidStatusActions bid={bid} projectId={id} isOwner={isOwner} />
          </div>

          {/* Team ratings */}
          <BidRating
            bidId={bidId}
            currentUserId={user?.id ?? ""}
            initialRatings={(bid.ratings ?? []) as BidRatingWithUser[]}
          />

          {/* Line items */}
          {bid.line_items.length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <h3 className="text-base font-semibold text-zinc-900 mb-4">
                Line Items
              </h3>
              <LineItemsTable
                items={bid.line_items.map((li) => ({
                  description: li.description,
                  quantity: li.quantity,
                  unit: li.unit ?? "",
                  unit_price: li.unit_price,
                }))}
                readonly
              />
            </div>
          )}

          {/* Documents */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="text-base font-semibold text-zinc-900 mb-4">
              Documents
            </h3>
            <BidDocuments
              bidId={bidId}
              projectId={id}
              documents={bid.documents}
            />
          </div>
        </div>

        {/* Right column — comments */}
        <div className="mt-6 lg:mt-0">
          <CommentsPanel
            bidId={bidId}
            initialComments={(initialComments ?? []) as CommentWithAuthor[]}
            currentUserId={user?.id ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
