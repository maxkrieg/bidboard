"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { createMessage } from "@/actions/messages";

interface MessageInputProps {
  projectId: string;
}

export function MessageInput({ projectId }: MessageInputProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;

    setError(null);
    startTransition(async () => {
      const result = await createMessage(projectId, trimmed);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setBody("");
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-zinc-200 p-3 bg-white">
      {error && <p className="text-xs text-red-500 mb-1">{error}</p>}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          disabled={isPending}
          className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={isPending || !body.trim()}
          className="p-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
