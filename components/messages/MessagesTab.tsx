"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageItem } from "./MessageItem";
import { MessageInput } from "./MessageInput";
import type { MessageWithAuthor } from "@/types";

interface MessagesTabProps {
  projectId: string;
  initialMessages: MessageWithAuthor[];
  currentUserId: string;
}

type AuthorProfile = { full_name: string | null; avatar_url: string | null; email: string };

export function MessagesTab({
  projectId,
  initialMessages,
  currentUserId,
}: MessagesTabProps) {
  const [messages, setMessages] = useState<MessageWithAuthor[]>(initialMessages);
  const authorCache = useRef<Record<string, AuthorProfile>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch current messages on mount (handles remount when switching tabs)
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("messages")
      .select("*, author:users(full_name, avatar_url, email)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) {
          setMessages(data as MessageWithAuthor[]);
          for (const m of data as MessageWithAuthor[]) {
            if (m.author) authorCache.current[m.author_id] = m.author;
          }
        }
      });
  }, [projectId]);

  // Scroll to bottom on mount and when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      .channel(`messages:project:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            project_id: string;
            author_id: string;
            body: string;
            created_at: string;
          };

          const author = await getAuthor(row.author_id);
          setMessages((prev) => {
            if (prev.find((m) => m.id === row.id)) return prev;
            return [...prev, { ...row, author }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col rounded-lg border border-zinc-200 bg-white overflow-hidden" style={{ height: "600px" }}>
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-12">
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isOwn={message.author_id === currentUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput projectId={projectId} />
    </div>
  );
}
