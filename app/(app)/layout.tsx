import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { UserMenu } from "@/components/shared/UserMenu";
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

  // Gate access based on approval status (admin always bypasses)
  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  if (!isAdmin) {
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("status")
      .eq("id", user.id)
      .single();
    if (profile?.status === "pending") redirect("/pending");
    if (profile?.status === "rejected") redirect("/rejected");
  }

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
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
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
            <UserMenu email={user.email ?? ""} initial={initial} isAdmin={isAdmin} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
