import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getBidById } from "@/actions/bids";
import { getProjectById } from "@/actions/projects";
import { createServerClient } from "@/lib/supabase/server";
import { BidForm } from "@/components/bids/BidForm";

export default async function EditBidPage({
  params,
}: {
  params: Promise<{ id: string; bidId: string }>;
}) {
  const { id, bidId } = await params;

  const [bidResult, projectResult] = await Promise.all([
    getBidById(bidId),
    getProjectById(id),
  ]);

  if (!bidResult.success || !projectResult.success) notFound();

  const bid = bidResult.data;
  const project = projectResult.data;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (project.owner_id !== user?.id) redirect(`/projects/${id}/bids/${bidId}`);

  return (
    <div>
      <Link
        href={`/projects/${id}/bids/${bidId}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 mb-6"
      >
        <ChevronLeft size={14} />
        Back to bid
      </Link>

      <h1 className="text-2xl font-bold text-zinc-900 mb-8">Edit Bid</h1>

      <BidForm
        projectId={id}
        projectLocation={project.location}
        bid={bid}
      />
    </div>
  );
}
