import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AddUserForm } from "./AddUserForm";
import { approveUser, rejectUser, removeUser } from "@/actions/admin";
import type { AdminUser } from "@/types";

export default async function AdminPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/dashboard");
  }

  const adminClient = createAdminClient();
  const { data: allUsers } = await adminClient
    .from("users")
    .select("*")
    .neq("email", process.env.ADMIN_EMAIL!)
    .order("created_at", { ascending: false });

  const users = (allUsers ?? []) as AdminUser[];
  const pendingUsers = users.filter((u) => u.status === "pending");

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-zinc-900">Admin Panel</h1>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
          Admin
        </span>
      </div>

      {/* Pending Requests */}
      <section>
        <h2 className="text-base font-semibold text-zinc-900 mb-3">
          Pending Requests
          {pendingUsers.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
              {pendingUsers.length}
            </span>
          )}
        </h2>

        {pendingUsers.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
            <p className="text-sm text-zinc-500">No pending requests.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">
                    Requested
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {pendingUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-900">{u.email}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {u.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(u.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <form action={approveUser.bind(null, u.id)}>
                          <Button type="submit" size="sm">
                            Approve
                          </Button>
                        </form>
                        <form action={rejectUser.bind(null, u.id)}>
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            Reject
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* All Users */}
      <section>
        <h2 className="text-base font-semibold text-zinc-900 mb-3">
          All Users
        </h2>

        {users.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
            <p className="text-sm text-zinc-500">No users yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">
                    Joined
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-zinc-900">{u.email}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {u.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status as "pending" | "approved" | "rejected"} />
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(u.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {u.status !== "approved" && (
                          <form action={approveUser.bind(null, u.id)}>
                            <Button type="submit" size="sm" variant="outline">
                              Approve
                            </Button>
                          </form>
                        )}
                        {u.status !== "rejected" && (
                          <form action={rejectUser.bind(null, u.id)}>
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            >
                              Reject
                            </Button>
                          </form>
                        )}
                        <form action={removeUser.bind(null, u.id)}>
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            className="text-zinc-500 hover:text-red-600"
                          >
                            Remove
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add User */}
      <AddUserForm />
    </div>
  );
}
