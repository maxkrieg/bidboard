import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getProjectById } from "@/actions/projects";
import { createServerClient } from "@/lib/supabase/server";
import { BidForm } from "@/components/bids/BidForm";

type PreviousContractor = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  location: string | null;
};

export default async function NewBidPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getProjectById(id);
  if (!result.success) notFound();

  const project = result.data;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (project.owner_id !== user?.id) redirect(`/projects/${id}`);

  const { data: ownedProjects } = await supabase
    .from("projects")
    .select("id")
    .eq("owner_id", user!.id);

  const ownedProjectIds = (ownedProjects ?? []).map((p) => p.id);

  let previousContractors: PreviousContractor[] = [];
  if (ownedProjectIds.length > 0) {
    const { data: bids } = await supabase
      .from("bids")
      .select(
        "contractor_id, contractor:contractors(id, name, phone, email, website, location)"
      )
      .in("project_id", ownedProjectIds);

    const seen = new Set<string>();
    previousContractors = (bids ?? [])
      .map((b) => b.contractor as PreviousContractor)
      .filter((c) => c && !seen.has(c.id) && !!seen.add(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div>
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 mb-6"
      >
        <ChevronLeft size={14} />
        Back to {project.name}
      </Link>

      <h1 className="text-2xl font-bold text-zinc-900 mb-8">Add Bid</h1>

      <BidForm
        projectId={id}
        projectLocation={project.location}
        previousContractors={previousContractors}
      />
    </div>
  );
}
