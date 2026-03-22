"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateBidStatus, rejectOtherBids } from "@/actions/bids";
import type { Bid, BidStatus } from "@/types";

interface BidStatusActionsProps {
  bid: Bid;
  projectId: string;
  isOwner: boolean;
}

export function BidStatusActions({ bid, projectId, isOwner }: BidStatusActionsProps) {
  const [currentStatus, setCurrentStatus] = useState<BidStatus>(bid.status);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [otherBidIds, setOtherBidIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleStatusChange(status: BidStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateBidStatus(bid.id, status);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCurrentStatus(status);
      if (
        status === "accepted" &&
        result.data.otherBidIds &&
        result.data.otherBidIds.length > 0
      ) {
        setOtherBidIds(result.data.otherBidIds);
        setShowRejectDialog(true);
      }
    });
  }

  async function handleRejectOthers() {
    startTransition(async () => {
      await rejectOtherBids(projectId, bid.id);
      setShowRejectDialog(false);
    });
  }

  const statusConfig: Record<
    BidStatus,
    { label: string; activeClass: string; inactiveClass: string }
  > = {
    pending: {
      label: "Pending",
      activeClass:
        "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100",
      inactiveClass:
        "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50",
    },
    accepted: {
      label: "Accept",
      activeClass:
        "bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100",
      inactiveClass:
        "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50",
    },
    rejected: {
      label: "Reject",
      activeClass: "bg-red-50 text-red-600 border-red-300 hover:bg-red-100",
      inactiveClass:
        "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50",
    },
  };

  if (!isOwner) {
    return (
      <p className="text-sm text-zinc-500">
        Only the project owner can change bid status.
      </p>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        {(["pending", "accepted", "rejected"] as BidStatus[]).map((status) => {
          const config = statusConfig[status];
          const isActive = currentStatus === status;
          return (
            <button
              key={status}
              type="button"
              disabled={isPending || isActive}
              onClick={() => handleStatusChange(status)}
              className={`px-3 py-1.5 rounded border text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                isActive ? config.activeClass : config.inactiveClass
              } ${isActive ? "opacity-100" : "opacity-70 hover:opacity-100"}`}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject other bids?</DialogTitle>
            <DialogDescription>
              You accepted this bid. There{" "}
              {otherBidIds.length === 1 ? "is" : "are"} {otherBidIds.length}{" "}
              other bid{otherBidIds.length !== 1 ? "s" : ""} on this project.
              Would you like to mark{" "}
              {otherBidIds.length === 1 ? "it" : "them"} as rejected?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={isPending}
            >
              No, keep them
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectOthers}
              disabled={isPending}
            >
              {isPending ? "Rejecting…" : "Yes, reject others"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
