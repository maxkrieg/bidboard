"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Reply, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CommentInput } from "./CommentInput";
import { updateComment, deleteComment } from "@/actions/comments";
import type { CommentWithAuthor } from "@/types";

interface CommentItemProps {
  comment: CommentWithAuthor;
  currentUserId: string;
  isReply?: boolean;
  onReply: (id: string) => void;
}

function getInitials(name: string | null, email: string): string {
  if (name) return name.charAt(0).toUpperCase();
  return email.charAt(0).toUpperCase();
}

function getDisplayName(name: string | null, email: string): string {
  return name ?? email.split("@")[0];
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function CommentItem({
  comment,
  currentUserId,
  isReply = false,
  onReply,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body ?? "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [localDeleted, setLocalDeleted] = useState(false);

  const isOwn = comment.author_id === currentUserId;
  const isDeleted = comment.deleted || localDeleted;

  function handleSaveEdit() {
    if (!editBody.trim()) return;
    startTransition(async () => {
      const result = await updateComment(comment.id, editBody.trim());
      if (result.success) {
        setIsEditing(false);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteComment(comment.id);
      if (result.success) {
        setShowDeleteDialog(false);
        setLocalDeleted(true);
      }
    });
  }

  return (
    <div className={`flex gap-2.5 ${isReply ? "ml-8" : ""}`}>
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center shrink-0">
        {getInitials(comment.author?.full_name ?? null, comment.author?.email ?? comment.author_id)}
      </div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-xs font-semibold text-zinc-800">
            {getDisplayName(comment.author?.full_name ?? null, comment.author?.email ?? comment.author_id)}
          </span>
          <span
            className="text-xs text-zinc-400"
            title={new Date(comment.created_at).toLocaleString()}
          >
            {formatRelativeTime(comment.created_at)}
          </span>
        </div>

        {/* Body */}
        {isDeleted ? (
          <p className="text-xs italic text-zinc-400">This comment was deleted.</p>
        ) : isEditing ? (
          <div>
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={2}
              className="w-full resize-none rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2 mt-1">
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isPending || !editBody.trim()}
              >
                {isPending ? "Saving…" : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setEditBody(comment.body ?? "");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-700 whitespace-pre-wrap break-words">
            {comment.body}
          </p>
        )}

        {/* Actions row */}
        {!isDeleted && !isEditing && (
          <div className="flex items-center gap-3 mt-1">
            {!isReply && (
              <button
                onClick={() => onReply(comment.id)}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
              >
                <Reply size={11} />
                Reply
              </button>
            )}
            {isOwn && (
              <DropdownMenu>
                <DropdownMenuTrigger className="text-zinc-400 hover:text-zinc-600">
                  <MoreHorizontal size={13} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil size={13} className="mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 size={13} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete comment?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            This cannot be undone. If this comment has replies, the text will be
            removed but the thread will remain.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
