"use client";

import { useState } from "react";
import { upsertBidRating } from "@/actions/ratings";
import type { BidRatingWithUser } from "@/types";

interface BidRatingProps {
  bidId: string;
  currentUserId: string;
  initialRatings: BidRatingWithUser[];
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
      className={`w-6 h-6 ${filled ? "text-amber-400" : "text-zinc-300"}`}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
      />
    </svg>
  );
}

function displayName(user: BidRatingWithUser["user"]): string {
  return user.full_name ?? user.email;
}

export function BidRating({
  bidId,
  currentUserId,
  initialRatings,
}: BidRatingProps) {
  const [ratings, setRatings] = useState<BidRatingWithUser[]>(initialRatings);
  const [hovered, setHovered] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myRating = ratings.find((r) => r.user_id === currentUserId);
  const currentRating = myRating?.rating ?? 0;

  const avg =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : null;

  async function handleRate(value: number) {
    if (saving) return;
    setError(null);

    // Optimistic update
    setRatings((prev) => {
      const existing = prev.find((r) => r.user_id === currentUserId);
      if (existing) {
        return prev.map((r) =>
          r.user_id === currentUserId ? { ...r, rating: value } : r
        );
      }
      // Placeholder with minimal user data until server responds
      return [
        ...prev,
        {
          id: "optimistic",
          bid_id: bidId,
          user_id: currentUserId,
          rating: value,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: { full_name: null, avatar_url: null, email: "" },
        },
      ];
    });

    setSaving(true);
    const result = await upsertBidRating(bidId, value);
    setSaving(false);

    if (!result.success) {
      setError(result.error);
      // Revert optimistic update
      setRatings(initialRatings);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-900">Team Ratings</h3>

      {/* Interactive star picker for current user */}
      <div className="space-y-1">
        <p className="text-xs text-zinc-500">Your rating</p>
        <div
          className="flex items-center gap-0.5"
          onMouseLeave={() => setHovered(0)}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHovered(star)}
              disabled={saving}
              className="p-0.5 disabled:opacity-60 hover:scale-110 transition-transform"
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            >
              <StarIcon filled={(hovered || currentRating) >= star} />
            </button>
          ))}
        </div>
        {currentRating === 0 && !hovered && (
          <p className="text-xs text-zinc-400">You haven&apos;t rated yet</p>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* Average summary */}
      {avg !== null && (
        <div className="flex items-center gap-1.5 py-2 border-t border-zinc-100">
          <StarIcon filled={true} />
          <span className="text-sm font-medium text-zinc-800">
            {avg.toFixed(1)}
          </span>
          <span className="text-xs text-zinc-500">
            · {ratings.length} {ratings.length === 1 ? "rating" : "ratings"}
          </span>
        </div>
      )}

      {/* Per-member ratings */}
      {ratings.length > 0 && (
        <div className="space-y-2 border-t border-zinc-100 pt-3">
          {ratings.map((r) => (
            <div key={r.id} className="flex items-center justify-between">
              <span className="text-xs text-zinc-600 truncate max-w-[120px]">
                {displayName(r.user)}
                {r.user_id === currentUserId && (
                  <span className="text-zinc-400"> (you)</span>
                )}
              </span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="w-3 h-3 inline-block">
                    <svg
                      viewBox="0 0 20 20"
                      fill={r.rating >= star ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth={r.rating >= star ? 0 : 1.5}
                      className={`w-3 h-3 ${r.rating >= star ? "text-amber-400" : "text-zinc-300"}`}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                      />
                    </svg>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
