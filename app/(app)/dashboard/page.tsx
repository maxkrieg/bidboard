import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/projects/ProjectCard";

const btnCls =
  "inline-flex items-center justify-center rounded-lg px-3 h-8 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors";

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  const allProjects = projects ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">My Projects</h1>
        <Link href="/projects/new" className={btnCls}>
          New Project
        </Link>
      </div>

      {allProjects.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-lg font-medium text-zinc-700 mb-2">
            No projects yet
          </p>
          <p className="mb-6">
            Create your first project to start collecting bids.
          </p>
          <Link href="/projects/new" className={btnCls}>
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={{
                ...project,
                status: project.status as "active" | "archived",
                bid_count: [],
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
