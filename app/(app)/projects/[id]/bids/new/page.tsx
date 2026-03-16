import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getProjectById } from "@/actions/projects";
import { BidForm } from "@/components/bids/BidForm";

export default async function NewBidPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getProjectById(id);
  if (!result.success) notFound();

  const project = result.data;

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

      <BidForm projectId={id} projectLocation={project.location} />
    </div>
  );
}
