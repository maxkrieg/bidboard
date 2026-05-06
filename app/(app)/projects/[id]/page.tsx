import { notFound } from "next/navigation";
import { getProjectById } from "@/actions/projects";
import { createServerClient } from "@/lib/supabase/server";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { ArchiveDropdown } from "@/components/projects/ArchiveDropdown";
import { ProjectSummaryBanner } from "@/components/projects/ProjectSummaryBanner";
import { NotesDrawer } from "@/components/notes/NotesDrawer";
import Link from "next/link";
import { ChevronLeft, Pencil, MapPin, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BidAnalysisRecord, MessageWithAuthor, ActivityLogWithActor, ProjectSummaryRecord, ProjectPhoto } from "@/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
function bannerUrl(storagePath: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/project-photos/${storagePath}`;
}

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
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 mb-5 transition-colors"
      >
        <ChevronLeft size={14} />
        Dashboard
      </Link>

      {/* Project header card */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-[var(--shadow-card)] px-6 py-5 mb-6">
        {result.data.banner_photo && (
          <div className="-mx-6 -mt-5 mb-5 h-52 rounded-t-xl overflow-hidden">
            <img
              src={bannerUrl(result.data.banner_photo.storage_path)}
              alt="Project banner"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-[26px] font-bold text-zinc-900 tracking-tight leading-tight">
              {result.data.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                <MapPin size={11} />
                {result.data.location}
              </span>
              {result.data.target_budget && (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                  <DollarSign size={11} />
                  {formatCurrency(result.data.target_budget)} budget
                </span>
              )}
              {result.data.target_date && (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                  <Calendar size={11} />
                  {new Date(result.data.target_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            <NotesDrawer
              projectId={id}
              projectName={result.data.name}
              bids={result.data.bids.map((b) => ({
                id: b.id,
                contractorName: b.contractor.name,
              }))}
              defaultScope="project"
            />
            {isOwner && (
              <>
                <Link href={`/projects/${id}/edit`}>
                  <Button variant="outline" size="default">
                    <Pencil size={14} className="mr-1.5" />
                    Edit
                  </Button>
                </Link>
                <ArchiveDropdown projectId={id} />
              </>
            )}
          </div>
        </div>

        {(result.data.description || result.data.criteria) && (
          <div className="mt-4 pt-4 border-t border-zinc-100 space-y-2.5">
            {result.data.description && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">Description</p>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {result.data.description}
                </p>
              </div>
            )}
            {result.data.criteria && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">Criteria</p>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {result.data.criteria}
                </p>
              </div>
            )}
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
        photos={(result.data.project_photos ?? []) as ProjectPhoto[]}
      />
    </div>
  );
}
