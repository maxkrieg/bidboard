import { notFound } from "next/navigation";
import { getProjectById } from "@/actions/projects";
import { createServerClient } from "@/lib/supabase/server";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { ArchiveDropdown } from "@/components/projects/ArchiveDropdown";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { BidAnalysisRecord, MessageWithAuthor, ActivityLogWithActor } from "@/types";

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

  // Fetch initial messages for the Messages tab
  const { data: initialMessages } = await supabase
    .from("messages")
    .select("*, author:users(full_name, avatar_url, email)")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  // Fetch initial activity for the Activity tab
  const { data: initialActivity } = await supabase
    .from("activity_log")
    .select("*, actor:users(full_name, avatar_url, email)")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 mb-6"
      >
        <ChevronLeft size={14} />
        Dashboard
      </Link>
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
        initialMessages={(initialMessages ?? []) as MessageWithAuthor[]}
        initialActivity={(initialActivity ?? []) as ActivityLogWithActor[]}
        currentUserId={user?.id ?? ""}
      />
    </div>
  );
}
