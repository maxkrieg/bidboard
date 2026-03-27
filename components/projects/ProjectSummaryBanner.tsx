"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ProjectSummaryRecord } from "@/types";

interface ProjectSummaryBannerProps {
  projectId: string;
  initialSummary: ProjectSummaryRecord | null;
  bidCount: number;
}

function formatRelativeDate(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ProjectSummaryBanner({
  projectId,
  initialSummary,
  bidCount,
}: ProjectSummaryBannerProps) {
  const [summary, setSummary] = useState(initialSummary);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`project-summary-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_summaries",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          setSummary(payload.new as ProjectSummaryRecord);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  if (bidCount === 0) {
    return (
      <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={14} className="text-zinc-400" />
          <span className="text-xs font-medium text-zinc-500">AI Summary</span>
        </div>
        <p className="text-sm text-zinc-400">
          Summary will appear once you add your first bid.
        </p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-indigo-400" />
          <span className="text-xs font-medium text-indigo-600">AI Summary</span>
        </div>
        <div className="space-y-1.5 animate-pulse">
          <div className="h-3 bg-zinc-200 rounded w-full" />
          <div className="h-3 bg-zinc-200 rounded w-4/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-4 py-3 mb-6">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-indigo-400" />
          <span className="text-xs font-medium text-indigo-600">AI Summary</span>
        </div>
        <span className="text-xs text-zinc-400">
          Updated {formatRelativeDate(summary.updated_at)}
        </span>
      </div>
      <p className="text-sm text-zinc-700 leading-relaxed">{summary.summary}</p>
    </div>
  );
}
