"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalysisBidSection } from "./AnalysisBidSection";
import type { BidWithMeta, BidAnalysisRecord } from "@/types";

interface AnalysisPanelProps {
  projectId: string;
  bids: BidWithMeta[];
  initialAnalysis: BidAnalysisRecord | null;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}

function isStale(analysis: BidAnalysisRecord, bids: BidWithMeta[]): boolean {
  const analysisDate = new Date(analysis.created_at);
  return bids.some((bid) => new Date(bid.created_at) > analysisDate);
}

export function AnalysisPanel({
  projectId,
  bids,
  initialAnalysis,
}: AnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<BidAnalysisRecord | null>(
    initialAnalysis
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRun = bids.length >= 2;
  const stale = analysis ? isStale(analysis, bids) : false;

  async function runAnalysis() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze-bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? "Analysis failed"
        );
      }

      const record = (await res.json()) as BidAnalysisRecord;
      setAnalysis(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // No analysis yet
  if (!analysis && !loading) {
    return (
      <div className="mt-8 border border-dashed border-zinc-200 rounded-xl p-8 text-center">
        <Sparkles size={28} className="text-indigo-400 mx-auto mb-3" />
        <p className="text-zinc-700 font-medium mb-1">AI Bid Analysis</p>
        <p className="text-sm text-zinc-400 mb-4">
          {canRun
            ? "Get a plain-English comparison of all bids, including highlights, red flags, and questions to ask each contractor."
            : "Add at least 2 bids to run a comparison analysis."}
        </p>
        {error && (
          <p className="text-sm text-red-600 mb-3">{error}</p>
        )}
        <Button
          onClick={runAnalysis}
          disabled={!canRun}
          className="gap-2"
        >
          <Sparkles size={14} />
          Run AI Analysis
        </Button>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="mt-8 border border-zinc-200 rounded-xl p-8 text-center">
        <Loader2 size={28} className="text-indigo-400 mx-auto mb-3 animate-spin" />
        <p className="text-zinc-600 font-medium">Analyzing bids…</p>
        <p className="text-sm text-zinc-400 mt-1">This usually takes 5–15 seconds.</p>
      </div>
    );
  }

  // Complete or stale
  if (!analysis) return null;

  const bidPriceMap = Object.fromEntries(bids.map((b) => [b.id, b.total_price]));

  return (
    <div className="mt-8 border border-zinc-200 rounded-xl overflow-hidden">
      {/* Stale banner */}
      {stale && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
          <AlertTriangle size={14} className="shrink-0" />
          <span>
            Bids have changed since this analysis. Re-run for updated results.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto border-amber-300 text-amber-800 hover:bg-amber-100 h-7 px-2 text-xs"
            onClick={runAnalysis}
          >
            Re-run
          </Button>
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-indigo-500" />
          <span className="text-sm font-semibold text-indigo-700">AI Summary</span>
        </div>

        {/* Summary */}
        <div className="border-l-4 border-indigo-300 pl-4 py-1 mb-6">
          <p className="text-zinc-700 text-sm leading-relaxed">{analysis.summary}</p>
        </div>

        {/* Per-bid sections */}
        {analysis.analysis.length > 0 && (
          <div className="space-y-3 mb-6">
            {analysis.analysis.map((bidAnalysis) => (
              <AnalysisBidSection
                key={bidAnalysis.bid_id}
                bid={bidAnalysis}
                totalPrice={bidPriceMap[bidAnalysis.bid_id] ?? 0}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
          <span className="text-xs text-zinc-400">
            Last run {formatRelativeDate(analysis.created_at)}
          </span>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <Button
            size="sm"
            variant="outline"
            onClick={runAnalysis}
            disabled={loading}
            className="gap-1.5 h-7 px-2 text-xs"
          >
            <RefreshCw size={12} />
            Re-run Analysis
          </Button>
        </div>
      </div>
    </div>
  );
}
