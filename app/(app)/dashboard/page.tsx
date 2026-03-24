import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/projects/ProjectCard";

const btnCls =
  "inline-flex items-center justify-center rounded-md px-4 h-9 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors";

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: projects } = await supabase
    .from("projects")
    .select("*, bids(id)")
    .order("created_at", { ascending: false });

  const allProjects = projects ?? [];
  const ownedProjects = allProjects.filter((p) => p.owner_id === user.id);
  const sharedProjects = allProjects.filter((p) => p.owner_id !== user.id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Dashboard</h1>

      {/* My Projects */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-700">My Projects</h2>
          <Link href="/projects/new" className={btnCls}>
            New Project
          </Link>
        </div>

        {ownedProjects.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen className="h-10 w-10 text-zinc-300 mx-auto mb-4" />
            <p className="text-sm font-medium text-zinc-900 mb-1">
              No projects yet
            </p>
            <p className="text-sm text-zinc-500 mb-6">
              Create your first project to start collecting bids.
            </p>
            <Link href="/projects/new" className={btnCls}>
              Create your first project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={{
                  ...project,
                  status: project.status as "active" | "archived",
                  bid_count: project.bids?.length ?? 0,
                }}
                isOwner
              />
            ))}
          </div>
        )}
      </div>

      {/* Shared with me */}
      {sharedProjects.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-zinc-700 mb-4">
            Shared with me
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={{
                  ...project,
                  status: project.status as "active" | "archived",
                  bid_count: project.bids?.length ?? 0,
                }}
                isOwner={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
