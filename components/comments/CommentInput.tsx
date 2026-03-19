"use client";

import { useRef, useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { createComment } from "@/actions/comments";

interface CommentInputProps {
  bidId: string;
  parentId?: string;
  onPost?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CommentInput({
  bidId,
  parentId,
  onPost,
  placeholder = "Write a comment…",
  autoFocus = false,
}: CommentInputProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`; // max ~4 rows
  }

  function handlePost() {
    const trimmed = body.trim();
    if (!trimmed) return;

    setError(null);
    startTransition(async () => {
      const result = await createComment(bidId, trimmed, parentId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setBody("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      onPost?.();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handlePost();
    }
  }

  return (
    <div className="border-t border-zinc-100 pt-3">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          autoResize();
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={1}
        className="w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-zinc-400">⌘+Enter to post</p>
        <Button
          size="sm"
          onClick={handlePost}
          disabled={isPending || !body.trim()}
        >
          {isPending ? "Posting…" : "Post"}
        </Button>
      </div>
    </div>
  );
}
