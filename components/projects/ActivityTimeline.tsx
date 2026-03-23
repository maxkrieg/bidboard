"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { ActivityLogWithActor, ActivityEventType } from "@/types";
import { ActivityFilter, filterEvents } from "./ActivityFilter";
import type { ActivityFilterValue } from "./ActivityFilter";

interface ActivityTimelineProps {
  initialActivity: ActivityLogWithActor[];
  projectId: string;
}

type ActorProfile = {
  full_name: string | null;
  avatar_url: string | null;
  email: string;
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function actorInitials(actor: ActorProfile): string {
  if (actor.full_name) {
    const parts = actor.full_name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }
  return actor.email[0].toUpperCase();
}

function actorDisplayName(actor: ActorProfile): string {
  return actor.full_name ?? actor.email;
}

function eventDescription(
  eventType: ActivityEventType,
  payload: Record<string, unknown>,
  actor: ActorProfile,
  projectId: string
): { text: React.ReactNode; href: string | null } {
  const name = actorDisplayName(actor);
  const bidName = typeof payload.bid_name === "string" ? payload.bid_name : "a bid";
  const bidId = typeof payload.bid_id === "string" ? payload.bid_id : null;
  const bidHref = bidId ? `/projects/${projectId}/bids/${bidId}` : null;

  switch (eventType) {
    case "bid_created":
      return {
        text: (
          <>
            <span className="font-medium">{name}</span> added a bid from{" "}
            <span className="font-medium">{bidName}</span>
          </>
        ),
        href: bidHref,
      };
    case "bid_updated":
      return {
        text: (
          <>
            <span className="font-medium">{name}</span> updated the bid from{" "}
            <span className="font-medium">{bidName}</span>
          </>
        ),
        href: bidHref,
      };
    case "bid_status_changed": {
      const oldStatus = typeof payload.old_status === "string" ? payload.old_status : "";
      const newStatus = typeof payload.new_status === "string" ? payload.new_status : "";
      return {
        text: (
          <>
            <span className="font-medium">{name}</span> changed{" "}
            <span className="font-medium">{bidName}</span>&apos;s status from{" "}
            <span className="capitalize">{oldStatus}</span> to{" "}
            <span className="capitalize font-medium">{newStatus}</span>
          </>
        ),
        href: bidHref,
      };
    }
    case "bid_deleted":
      return {
        text: (
          <>
            <span className="font-medium">{name}</span> deleted the bid from{" "}
            <span className="font-medium">{bidName}</span>
          </>
        ),
        href: null,
      };
    case "document_uploaded": {
      const filename = typeof payload.filename === "string" ? payload.filename : "a document";
      return {
        text: (
          <>
            <span className="font-medium">{name}</span> uploaded{" "}
            <span className="font-medium">{filename}</span> to{" "}
            <span className="font-medium">{bidName}</span>
          </>
        ),
        href: bidHref,
      };
    }
    case "collaborator_joined":
      return {
        text: (
          <>
            <span className="font-medium">{name}</span> joined the project
          </>
        ),
        href: null,
      };
    case "analysis_completed": {
      const bidCount = typeof payload.bid_count === "number" ? payload.bid_count : "";
      return {
        text: (
          <>
            <span className="font-medium">{name}</span> ran AI analysis
            {bidCount ? ` on ${bidCount} bids` : ""}
          </>
        ),
        href: null,
      };
    }
    case "comment_added":
      return {
        text: (
          <>
            <span className="font-medium">{name}</span> commented on{" "}
            <span className="font-medium">{bidName}</span>
          </>
        ),
        href: bidHref,
      };
    case "message_sent":
      return {
        text: (
          <>
            <span className="font-medium">{name}</span> sent a message
          </>
        ),
        href: null,
      };
  }
}

interface ActivityItemProps {
  entry: ActivityLogWithActor;
  projectId: string;
}

function ActivityItem({ entry, projectId }: ActivityItemProps) {
  const { text, href } = eventDescription(
    entry.event_type,
    entry.payload,
    entry.actor,
    projectId
  );

  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
        {actorInitials(entry.actor)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-700 leading-snug">{text}</p>
        <p className="text-xs text-zinc-400 mt-0.5">
          {formatRelativeTime(entry.created_at)}
        </p>
      </div>
      {href && (
        <Link
          href={href}
          className="flex-shrink-0 text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-0.5"
        >
          View →
        </Link>
      )}
    </div>
  );
}

export function ActivityTimeline({
  initialActivity,
  projectId,
}: ActivityTimelineProps) {
  const [activity, setActivity] = useState<ActivityLogWithActor[]>(initialActivity);
  const [filter, setFilter] = useState<ActivityFilterValue>("all");
  const actorCache = useRef<Record<string, ActorProfile>>({});

  // Pre-populate cache from initial data
  useEffect(() => {
    for (const entry of initialActivity) {
      actorCache.current[entry.actor_id] = entry.actor;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function getActor(userId: string): Promise<ActorProfile> {
    if (actorCache.current[userId]) return actorCache.current[userId];
    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("full_name, avatar_url, email")
      .eq("id", userId)
      .single();
    const profile: ActorProfile = {
      full_name: data?.full_name ?? null,
      avatar_url: data?.avatar_url ?? null,
      email: data?.email ?? userId,
    };
    actorCache.current[userId] = profile;
    return profile;
  }

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`activity:project:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_log",
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            project_id: string;
            actor_id: string;
            event_type: ActivityEventType;
            payload: Record<string, unknown>;
            created_at: string;
          };

          const actor = await getActor(row.actor_id);
          setActivity((prev) => {
            if (prev.find((e) => e.id === row.id)) return prev;
            return [{ ...row, actor }, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const allowedEvents = filterEvents(filter);
  const visible = allowedEvents
    ? activity.filter((e) => allowedEvents.includes(e.event_type))
    : activity;

  return (
    <div>
      <ActivityFilter active={filter} onChange={setFilter} />

      {visible.length === 0 ? (
        <p className="text-sm text-zinc-400 py-8 text-center">
          No activity yet.
        </p>
      ) : (
        <div className="space-y-4">
          {visible.map((entry) => (
            <ActivityItem key={entry.id} entry={entry} projectId={projectId} />
          ))}
        </div>
      )}
    </div>
  );
}
