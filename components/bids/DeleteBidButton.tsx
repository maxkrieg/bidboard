"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { deleteBid } from "@/actions/bids";

interface DeleteBidButtonProps {
  bidId: string;
}

export function DeleteBidButton({ bidId }: DeleteBidButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await deleteBid(bidId);
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        onClick={() => setOpen(true)}
      >
        <Trash2 size={13} className="mr-1.5" />
        Delete
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete bid?</DialogTitle>
            <DialogDescription>
              This will permanently delete this bid and all associated line
              items and documents. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete Bid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
