import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/shared/NotificationBell";
import type { Notification } from "@/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const initial = user.email?.[0]?.toUpperCase() ?? "U";

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const typedNotifications = (notifications ?? []) as Notification[];
  const unreadCount = typedNotifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="h-14 sticky top-0 z-40 border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 h-full flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold tracking-tight">
                BB
              </span>
            </div>
            <span className="font-bold text-zinc-900 text-lg">BidBoard</span>
          </Link>

          <div className="flex items-center gap-3">
            <NotificationBell
              initialUnreadCount={unreadCount}
              initialNotifications={typedNotifications}
            />
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-sm font-semibold text-indigo-700">
                {initial}
              </span>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
