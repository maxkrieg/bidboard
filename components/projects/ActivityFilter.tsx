"use client";

import type { ActivityEventType } from "@/types";

export type ActivityFilterValue = "all" | "bids" | "analysis" | "people";

const BID_EVENTS: ActivityEventType[] = [
  "bid_created",
  "bid_updated",
  "bid_status_changed",
  "bid_deleted",
  "document_uploaded",
];

const ANALYSIS_EVENTS: ActivityEventType[] = ["analysis_completed"];

const PEOPLE_EVENTS: ActivityEventType[] = [
  "collaborator_joined",
  "comment_added",
  "message_sent",
];

export function filterEvents(filter: ActivityFilterValue): ActivityEventType[] | null {
  if (filter === "all") return null;
  if (filter === "bids") return BID_EVENTS;
  if (filter === "analysis") return ANALYSIS_EVENTS;
  if (filter === "people") return PEOPLE_EVENTS;
  return null;
}

const FILTERS: { value: ActivityFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bids", label: "Bids" },
  { value: "analysis", label: "Analysis" },
  { value: "people", label: "People" },
];

interface ActivityFilterProps {
  active: ActivityFilterValue;
  onChange: (value: ActivityFilterValue) => void;
}

export function ActivityFilter({ active, onChange }: ActivityFilterProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {FILTERS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            active === value
              ? "bg-indigo-100 text-indigo-700"
              : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
