"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirmGoogleBusiness, skipGoogleConfirmation } from "@/actions/bids";
import type { GooglePlaceCandidate } from "@/types";

interface Props {
  contractorId: string;
  contractorName: string;
  projectLocation: string;
  onDone: () => void;
}

type ViewState = "searching" | "found" | "not_found" | "results" | "confirming";

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500 font-medium">
      {"★".repeat(Math.round(rating))}
      {"☆".repeat(5 - Math.round(rating))}
      <span className="text-zinc-600 ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

function CandidateCard({
  candidate,
  onSelect,
  isSelecting,
}: {
  candidate: GooglePlaceCandidate;
  onSelect: () => void;
  isSelecting: boolean;
}) {
  return (
    <div className="border border-zinc-200 rounded-lg p-4 flex items-start justify-between gap-4 bg-white">
      <div className="min-w-0">
        <p className="font-medium text-zinc-900 truncate">{candidate.name}</p>
        {candidate.rating !== null && (
          <div className="mt-1">
            <StarRating rating={candidate.rating} />
            {candidate.reviewCount !== null && (
              <span className="text-zinc-500 text-sm ml-2">
                ({candidate.reviewCount.toLocaleString()} reviews)
              </span>
            )}
          </div>
        )}
        {candidate.address && (
          <p className="text-zinc-500 text-sm mt-1 truncate">{candidate.address}</p>
        )}
      </div>
      <Button
        size="sm"
        onClick={onSelect}
        disabled={isSelecting}
        className="shrink-0"
      >
        {isSelecting ? "Saving…" : "Select"}
      </Button>
    </div>
  );
}

export function GoogleBusinessConfirmationModal({
  contractorId,
  contractorName,
  projectLocation,
  onDone,
}: Props) {
  const [view, setView] = useState<ViewState>("searching");
  const [topCandidate, setTopCandidate] = useState<GooglePlaceCandidate | null>(null);
  const [candidates, setCandidates] = useState<GooglePlaceCandidate[]>([]);
  const [searchQuery, setSearchQuery] = useState(contractorName);
  const [isSearching, setIsSearching] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const didAutoSearch = useRef(false);

  useEffect(() => {
    if (didAutoSearch.current) return;
    didAutoSearch.current = true;
    runSearch(contractorName, /* isAuto */ true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(query: string, isAuto = false) {
    if (isAuto) {
      setView("searching");
    } else {
      setIsSearching(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({ q: query, location: projectLocation });
      const res = await fetch(`/api/google-places-search?${params.toString()}`);
      if (!res.ok) throw new Error("Search failed");
      const json = (await res.json()) as { candidates: GooglePlaceCandidate[] };

      if (isAuto) {
        if (json.candidates.length > 0) {
          setTopCandidate(json.candidates[0]);
          setView("found");
        } else {
          setView("not_found");
        }
      } else {
        setCandidates(json.candidates);
        setView("results");
      }
    } catch {
      setError("Search failed. Please try again.");
      if (isAuto) setView("not_found");
    } finally {
      if (!isAuto) setIsSearching(false);
    }
  }

  async function handleConfirm(placeId: string) {
    setSelectingId(placeId);
    setView("confirming");
    setError(null);

    const result = await confirmGoogleBusiness(contractorId, placeId, projectLocation);
    if (result.success) {
      onDone();
    } else {
      setError(result.error);
      setSelectingId(null);
      setView(topCandidate ? "found" : "results");
    }
  }

  async function handleSkip() {
    setView("confirming");
    await skipGoogleConfirmation(contractorId, projectLocation);
    onDone();
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) runSearch(searchQuery);
  }

  const searchForm = (
    <form onSubmit={handleSearchSubmit} className="flex gap-2">
      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="e.g. Acme Roofing Denver CO"
        className="flex-1"
      />
      <Button type="submit" variant="secondary" disabled={isSearching || !searchQuery.trim()}>
        {isSearching ? "Searching…" : "Search"}
      </Button>
    </form>
  );

  const skipButton = (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSkip}
      className="text-zinc-500 hover:text-zinc-700"
    >
      Skip — don&apos;t link to Google
    </Button>
  );

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm Google Business</DialogTitle>
          <DialogDescription>
            Linking to the correct Google listing pulls in ratings, reviews, and contact info.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* Searching */}
          {view === "searching" && (
            <div className="flex items-center gap-3 py-4 text-zinc-500">
              <svg
                className="animate-spin h-5 w-5 shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Searching Google for &ldquo;{contractorName}&rdquo;…</span>
            </div>
          )}

          {/* Confirming */}
          {view === "confirming" && (
            <div className="flex items-center gap-3 py-4 text-zinc-500">
              <svg
                className="animate-spin h-5 w-5 shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Saving…</span>
            </div>
          )}

          {/* Found — show top candidate prominently */}
          {view === "found" && topCandidate && (
            <>
              <p className="text-sm text-zinc-600">
                We found this business on Google for &ldquo;{contractorName}&rdquo;:
              </p>
              <CandidateCard
                candidate={topCandidate}
                onSelect={() => handleConfirm(topCandidate.place_id)}
                isSelecting={selectingId === topCandidate.place_id}
              />
              <div className="border-t border-zinc-100 pt-4 space-y-2">
                <p className="text-sm text-zinc-500">Not the right business?</p>
                {searchForm}
              </div>
              <div className="flex justify-end">{skipButton}</div>
            </>
          )}

          {/* Not found — go straight to search */}
          {view === "not_found" && (
            <>
              <p className="text-sm text-zinc-600">
                No match found for &ldquo;{contractorName}&rdquo; on Google. Try searching manually:
              </p>
              {searchForm}
              <div className="flex justify-end">{skipButton}</div>
            </>
          )}

          {/* Search results */}
          {view === "results" && (
            <>
              {candidates.length === 0 ? (
                <p className="text-sm text-zinc-500 py-2">No results found. Try a different search.</p>
              ) : (
                <div className="space-y-2">
                  {candidates.map((c) => (
                    <CandidateCard
                      key={c.place_id}
                      candidate={c}
                      onSelect={() => handleConfirm(c.place_id)}
                      isSelecting={selectingId === c.place_id}
                    />
                  ))}
                </div>
              )}
              <div className="border-t border-zinc-100 pt-4 space-y-2">
                <p className="text-sm text-zinc-500">Search again:</p>
                {searchForm}
              </div>
              <div className="flex justify-end">{skipButton}</div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
