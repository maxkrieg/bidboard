import { notFound } from "next/navigation";
import { getProjectById } from "@/actions/projects";
import { createServerClient } from "@/lib/supabase/server";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { ArchiveDropdown } from "@/components/projects/ArchiveDropdown";
import { ProjectSummaryBanner } from "@/components/projects/ProjectSummaryBanner";
import Link from "next/link";
import { ChevronLeft, Pencil, MapPin, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BidAnalysisRecord, MessageWithAuthor, ActivityLogWithActor, ProjectSummaryRecord } from "@/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

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

  // Fetch AI project summary
  const { data: projectSummary } = await supabase
    .from("project_summaries")
    .select("*")
    .eq("project_id", id)
    .maybeSingle();

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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-zinc-500">
            <span className="flex items-center gap-1">
              <MapPin size={13} className="text-zinc-400" />
              {result.data.location}
            </span>
            {result.data.target_budget && (
              <span className="flex items-center gap-1">
                <DollarSign size={13} className="text-zinc-400" />
                {formatCurrency(result.data.target_budget)} budget
              </span>
            )}
            {result.data.target_date && (
              <span className="flex items-center gap-1">
                <Calendar size={13} className="text-zinc-400" />
                {new Date(result.data.target_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
          {result.data.description && (
            <p className="mt-2 text-sm text-zinc-500 line-clamp-3 max-w-prose">
              {result.data.description}
            </p>
          )}
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <Link href={`/projects/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil size={13} className="mr-1.5" />
                Edit
              </Button>
            </Link>
            <ArchiveDropdown projectId={id} />
          </div>
        )}
      </div>

      <ProjectSummaryBanner
        projectId={id}
        initialSummary={(projectSummary as ProjectSummaryRecord | null) ?? null}
        bidCount={result.data.bid_count}
      />

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
