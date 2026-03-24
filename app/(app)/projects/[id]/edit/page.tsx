import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getProjectById, updateProject } from "@/actions/projects";
import { createServerClient } from "@/lib/supabase/server";
import { ProjectForm } from "@/components/projects/ProjectForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Project — BidBoard" };

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getProjectById(id);
  if (!result.success) notFound();

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id !== result.data.owner_id) redirect(`/projects/${id}`);

  const updateProjectWithId = updateProject.bind(null, id);

  return (
    <div>
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 mb-6"
      >
        <ChevronLeft size={14} />
        Back to project
      </Link>

      <div className="max-w-lg">
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h1 className="text-lg font-semibold text-zinc-900 mb-1">
            Edit Project
          </h1>
          <p className="text-sm text-zinc-500 mb-6">
            Update your project details.
          </p>
          <ProjectForm project={result.data} action={updateProjectWithId} />
        </div>
      </div>
    </div>
  );
}
