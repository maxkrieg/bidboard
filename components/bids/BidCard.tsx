import Link from "next/link";
import { Clock, CalendarX } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { BidWithMeta } from "@/types";

interface BidCardProps {
  bid: BidWithMeta;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function isExpiringSoon(expiry: string | null): boolean {
  if (!expiry) return false;
  const diff = new Date(expiry).getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function statusAccentClass(status: string): string {
  if (status === "accepted") return "bg-indigo-500";
  if (status === "rejected") return "bg-red-400";
  return "bg-amber-400";
}

export function BidCard({ bid }: BidCardProps) {
  const expiringSoon = isExpiringSoon(bid.expiry_date);

  const ratings = bid.ratings ?? [];
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : null;

  return (
    <Link href={`/projects/${bid.project_id}/bids/${bid.id}`}>
      <div
        className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
      >
        <div className={`absolute inset-y-0 left-0 w-[3px] ${statusAccentClass(bid.status)}`} />
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium text-zinc-700 leading-tight">
            {bid.contractor.name}
          </p>
          <StatusBadge status={bid.status} />
        </div>

        <p className="text-2xl font-bold text-zinc-900 mb-3 mt-0.5">
          {formatCurrency(bid.total_price)}
        </p>

        <div className="space-y-1 text-xs text-zinc-500">
          {bid.estimated_days && (
            <div className="flex items-center gap-1.5">
              <Clock size={11} className="shrink-0" />
              <span>{bid.estimated_days} days</span>
            </div>
          )}
          {bid.expiry_date && (
            <div
              className={`flex items-center gap-1.5 ${
                expiringSoon ? "text-amber-600 font-medium" : ""
              }`}
            >
              <CalendarX size={11} className="shrink-0" />
              <span>
                Expires{" "}
                {new Date(bid.expiry_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                {expiringSoon && " — soon!"}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="text-amber-400">★</span>
            {avgRating !== null ? (
              <span>
                {avgRating.toFixed(1)} · {ratings.length}{" "}
                {ratings.length === 1 ? "rating" : "ratings"}
              </span>
            ) : (
              <span className="text-zinc-400">No ratings yet</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
