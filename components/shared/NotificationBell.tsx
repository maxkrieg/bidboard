"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markNotificationRead, markAllNotificationsRead } from "@/actions/notifications";
import type { Notification } from "@/types";

interface NotificationBellProps {
  initialUnreadCount: number;
  initialNotifications: Notification[];
}

function urlFor(n: Notification): string {
  if (n.type === "bid_added" || n.type === "comment_added") {
    if (n.project_id && n.reference_id) {
      return `/projects/${n.project_id}/bids/${n.reference_id}`;
    }
    if (n.project_id) return `/projects/${n.project_id}`;
  }
  if (n.type === "message_added" || n.type === "analysis_ready") {
    if (n.project_id) return `/projects/${n.project_id}`;
  }
  return "/dashboard";
}

function typeLabel(type: Notification["type"]): string {
  switch (type) {
    case "invite":
      return "Project invite";
    case "bid_added":
      return "New bid added";
    case "comment_added":
      return "New comment";
    case "message_added":
      return "New message";
    case "analysis_ready":
      return "AI analysis ready";
  }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({
  initialUnreadCount,
  initialNotifications,
}: NotificationBellProps) {
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    });
  }

  function handleClick(n: Notification) {
    if (!n.read) {
      startTransition(async () => {
        await markNotificationRead(n.id);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === n.id ? { ...item, read: true } : item
          )
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      });
    }
    router.push(urlFor(n));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative h-8 w-8 rounded-md flex items-center justify-center hover:bg-zinc-100 transition-colors" aria-label="Notifications">
        <Bell className="h-4 w-4 text-zinc-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2.5 py-2">
          <span className="text-sm font-semibold text-zinc-900">
            Notifications
          </span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-zinc-400">
            No notifications yet
          </div>
        ) : (
          <DropdownMenuGroup>
            {notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => handleClick(n)}
                className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer"
              >
                {!n.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                )}
                {n.read && <span className="mt-1.5 h-2 w-2 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 leading-snug">
                    {typeLabel(n.type)}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {relativeTime(n.created_at)}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
