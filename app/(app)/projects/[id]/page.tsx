import { notFound } from "next/navigation";
import { getProjectById } from "@/actions/projects";
import { createServerClient } from "@/lib/supabase/server";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { ArchiveDropdown } from "@/components/projects/ArchiveDropdown";
import type { BidAnalysisRecord } from "@/types";

export default async function ProjectPage({
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

  const isOwner = user?.id === result.data.owner_id;

  // Fetch owner's profile for the collaborators tab
  const { data: ownerProfile } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", result.data.owner_id)
    .single();

  // Fetch existing analysis for this project
  const { data: analysis } = await supabase
    .from("bid_analyses")
    .select("*")
    .eq("project_id", id)
    .maybeSingle();

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {result.data.name}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{result.data.location}</p>
        </div>
        {isOwner && <ArchiveDropdown projectId={id} />}
      </div>

      <ProjectTabs
        project={result.data}
        isOwner={isOwner}
        ownerEmail={ownerProfile?.email ?? user?.email ?? ""}
        ownerName={ownerProfile?.full_name ?? null}
        initialAnalysis={(analysis as BidAnalysisRecord | null) ?? null}
      />
    </div>
  );
}
