"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { CommentItem } from "./CommentItem";
import { CommentInput } from "./CommentInput";
import type { CommentWithAuthor } from "@/types";

interface CommentsPanelProps {
  bidId: string;
  initialComments: CommentWithAuthor[];
  currentUserId: string;
}

type AuthorProfile = { full_name: string | null; avatar_url: string | null; email: string };

export function CommentsPanel({
  bidId,
  initialComments,
  currentUserId,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>(initialComments);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const authorCache = useRef<Record<string, AuthorProfile>>({});

  // Populate cache from initial comments
  useEffect(() => {
    for (const c of initialComments) {
      authorCache.current[c.author_id] = c.author;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch author profile on demand
  async function getAuthor(userId: string): Promise<AuthorProfile> {
    if (authorCache.current[userId]) return authorCache.current[userId];
    const supabase = createClient();
    const { data } = await supabase
      .from("users")
      .select("full_name, avatar_url, email")
      .eq("id", userId)
      .single();
    const profile: AuthorProfile = {
      full_name: data?.full_name ?? null,
      avatar_url: data?.avatar_url ?? null,
      email: data?.email ?? userId,
    };
    authorCache.current[userId] = profile;
    return profile;
  }

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`comments:bid:${bidId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `bid_id=eq.${bidId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            bid_id: string;
            author_id: string;
            parent_id: string | null;
            body: string | null;
            deleted: boolean;
            created_at: string;
            updated_at: string;
          };

          // Skip if we already have it (optimistic from own session)
          setComments((prev) => {
            if (prev.find((c) => c.id === row.id)) return prev;
            return prev; // Will be added after author fetch below
          });

          const author = await getAuthor(row.author_id);
          setComments((prev) => {
            if (prev.find((c) => c.id === row.id)) return prev;
            return [...prev, { ...row, author }];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "comments",
          filter: `bid_id=eq.${bidId}`,
        },
        (payload) => {
          const row = payload.new as CommentWithAuthor;
          setComments((prev) =>
            prev.map((c) =>
              c.id === row.id ? { ...c, body: row.body, deleted: row.deleted, updated_at: row.updated_at } : c
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "comments",
          filter: `bid_id=eq.${bidId}`,
        },
        (payload) => {
          const row = payload.old as { id: string };
          setComments((prev) => prev.filter((c) => c.id !== row.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bidId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group: top-level + their replies
  const topLevel = comments.filter((c) => c.parent_id === null);
  const repliesFor = (parentId: string) =>
    comments.filter((c) => c.parent_id === parentId);

  const isEmpty = comments.length === 0;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white flex flex-col h-full">
      <div className="p-4 border-b border-zinc-100">
        <h3 className="text-base font-semibold text-zinc-900">Comments</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isEmpty ? (
          <p className="text-sm text-zinc-400 text-center py-6">
            No comments yet. Be the first to comment.
          </p>
        ) : (
          topLevel.map((comment) => (
            <div key={comment.id} className="space-y-3">
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                onReply={setReplyTo}
              />
              {repliesFor(comment.id).map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  isReply
                  onReply={setReplyTo}
                />
              ))}
              {replyTo === comment.id && (
                <div className="ml-8">
                  <CommentInput
                    bidId={bidId}
                    parentId={comment.id}
                    placeholder="Write a reply…"
                    autoFocus
                    onPost={() => setReplyTo(null)}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-4">
        {replyTo === null && (
          <CommentInput bidId={bidId} onPost={() => {}} />
        )}
      </div>
    </div>
  );
}
