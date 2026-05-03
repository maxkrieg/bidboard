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
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={13} className="text-zinc-300" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">AI Project Status</span>
        </div>
        <p className="text-sm text-zinc-400">
          Summary will appear once you add your first bid.
        </p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-5 py-4 mb-6">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100">
            <Sparkles size={11} className="text-indigo-400" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">AI Project Status</span>
        </div>
        <div className="space-y-2 animate-pulse">
          <div className="h-2.5 bg-indigo-100 rounded-full w-full" />
          <div className="h-2.5 bg-indigo-100 rounded-full w-4/5" />
          <div className="h-2.5 bg-indigo-100 rounded-full w-3/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-transparent px-5 py-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100">
            <Sparkles size={11} className="text-indigo-500" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">AI Project Status</span>
        </div>
        <span className="text-xs text-zinc-400">
          Updated {formatRelativeDate(summary.updated_at)}
        </span>
      </div>
      <p className="text-sm text-zinc-700 leading-relaxed">{summary.summary}</p>
    </div>
  );
}
