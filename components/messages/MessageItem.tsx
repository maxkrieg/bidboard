import type { MessageWithAuthor } from "@/types";

interface MessageItemProps {
  message: MessageWithAuthor;
  isOwn: boolean;
}

function getDisplayName(name: string | null, email: string): string {
  return name ?? email.split("@")[0];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MessageItem({ message, isOwn }: MessageItemProps) {
  const displayName = getDisplayName(
    message.author.full_name,
    message.author.email
  );

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        <span className={`text-xs text-zinc-400 ${isOwn ? "text-right" : ""}`}>
          {isOwn ? "You" : displayName} · {formatTime(message.created_at)}
        </span>
        <div
          className={`px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isOwn
              ? "bg-indigo-600 text-white rounded-br-sm"
              : "bg-zinc-100 text-zinc-800 rounded-bl-sm"
          }`}
        >
          {message.body}
        </div>
      </div>
    </div>
  );
}
