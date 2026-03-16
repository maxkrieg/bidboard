import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getProjectById } from "@/actions/projects";
import { ComparisonTable } from "@/components/bids/ComparisonTable";

export default async function CompareBidsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getProjectById(id);
  if (!result.success) notFound();

  const project = result.data;
  const bids = project.bids;

  return (
    <div>
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 mb-6"
      >
        <ChevronLeft size={14} />
        Back to {project.name}
      </Link>

      <h1 className="text-2xl font-bold text-zinc-900 mb-8">Compare Bids</h1>

      {bids.length < 2 ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-12 text-center">
          <p className="text-zinc-500 mb-2">
            You need at least 2 bids to compare.
          </p>
          <Link
            href={`/projects/${id}/bids/new`}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Add a bid →
          </Link>
        </div>
      ) : (
        <ComparisonTable bids={bids} />
      )}
    </div>
  );
}
