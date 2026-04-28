import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { signOut } from "@/actions/auth";

export default async function PendingPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("users")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profile?.status === "approved") redirect("/dashboard");
  if (profile?.status === "rejected") redirect("/rejected");

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 p-8">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold tracking-tight">
              BB
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-8 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-zinc-900 mb-2">
            Your request is pending review
          </h1>
          <p className="text-sm text-zinc-500 mb-6">
            Your access request has been received. The admin will review it
            shortly. You&apos;ll receive an email once your account is approved.
          </p>

          <form action={signOut}>
            <Button type="submit" variant="outline" className="w-full">
              Sign out
            </Button>
          </form>
        </div>

        <p className="text-xs text-zinc-400 mt-4">
          Signed in as {user.email}
        </p>
      </div>
    </main>
  );
}
