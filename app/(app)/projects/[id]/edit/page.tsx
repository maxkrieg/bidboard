import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getProjectById, updateProject } from "@/actions/projects";
import { createServerClient } from "@/lib/supabase/server";
import { ProjectForm } from "@/components/projects/ProjectForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="max-w-xl mx-auto">
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 mb-6"
      >
        <ChevronLeft size={14} />
        Back to project
      </Link>

      <Card className="border border-zinc-200">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-zinc-900">Edit Project</CardTitle>
          <CardDescription className="text-zinc-500">Update your project details.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm project={result.data} action={updateProjectWithId} />
        </CardContent>
      </Card>
    </div>
  );
}
