import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { signOut } from "@/actions/auth";

export default async function RejectedPage() {
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
  if (profile?.status === "pending") redirect("/pending");

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
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-zinc-900 mb-2">
            Access request declined
          </h1>
          <p className="text-sm text-zinc-500 mb-6">
            Unfortunately your access request was not approved. If you believe
            this is a mistake, please contact the administrator.
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
