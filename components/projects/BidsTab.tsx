import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BidCard } from "@/components/bids/BidCard";
import type { BidWithMeta } from "@/types";

interface BidsTabProps {
  projectId: string;
  bids: BidWithMeta[];
}

export function BidsTab({ projectId, bids }: BidsTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-zinc-500">
          {bids.length > 0
            ? `${bids.length} bid${bids.length !== 1 ? "s" : ""}`
            : "No bids yet"}
        </p>
        <div className="flex items-center gap-2">
          {bids.length >= 2 && (
            <Link href={`/projects/${projectId}/compare`}>
              <Button variant="outline" size="sm">
                Compare Bids
              </Button>
            </Link>
          )}
          <Link href={`/projects/${projectId}/bids/new`}>
            <Button size="sm">
              <Plus size={14} className="mr-1.5" />
              Add Bid
            </Button>
          </Link>
        </div>
      </div>

      {bids.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText size={40} className="text-zinc-300 mb-4" />
          <p className="text-zinc-600 font-medium mb-1">No bids yet</p>
          <p className="text-zinc-400 text-sm mb-4">
            Add your first bid to start comparing contractors.
          </p>
          <Link href={`/projects/${projectId}/bids/new`}>
            <Button>
              <Plus size={14} className="mr-1.5" />
              Add your first bid
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bids.map((bid) => (
            <BidCard key={bid.id} bid={bid} />
          ))}
        </div>
      )}

      {/* AI Analysis panel placeholder — Phase 5 */}
    </div>
  );
}
