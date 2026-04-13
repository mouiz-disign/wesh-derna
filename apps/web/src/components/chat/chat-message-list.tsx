"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Smile, Trash2 } from "lucide-react";
import { getSocket } from "@/lib/socket";
import type { Message, Reaction } from "@repo/types";

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "😂", "😢", "🎉", "👀", "🙏", "✅", "❌", "🚀", "💡", "🤔", "😍", "👏", "💯", "🙌", "😅", "🤝", "⭐"];

interface Props {
  messages: Message[];
  currentUserId: string;
  channelId?: string;
  dmUserId?: string;
}

export function ChatMessageList({ messages, currentUserId, channelId, dmUserId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleReact = (messageId: string, emoji: string) => {
    const socket = getSocket();
    socket.emit("message:react", { messageId, emoji, channelId, dmUserId });
    setEmojiPickerFor(null);
  };

  const handleDelete = (messageId: string) => {
    const socket = getSocket();
    socket.emit("message:delete", { messageId, channelId, dmUserId });
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Aucun message. Commencez la conversation !
        </p>
      </div>
    );
  }

  let lastAuthorId = "";
  let lastTime = "";

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      {messages.map((msg, i) => {
        const isConsecutive =
          msg.authorId === lastAuthorId &&
          lastTime &&
          new Date(msg.createdAt).getTime() - new Date(lastTime).getTime() < 5 * 60 * 1000;

        lastAuthorId = msg.authorId;
        lastTime = msg.createdAt;

        const initials = msg.author?.name
          ?.split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        const isMe = msg.authorId === currentUserId;
        const reactions: Reaction[] = (msg.reactions as Reaction[]) || [];

        return (
          <div key={msg.id} className={`group relative ${isConsecutive ? "pl-10 py-0.5" : `flex gap-3 py-2 ${i > 0 ? "mt-2" : ""}`} hover:bg-muted/30 rounded-md`}>
            {/* Hover toolbar */}
            <div className="absolute right-2 -top-3 hidden group-hover:flex items-center gap-0.5 bg-[var(--surface-lowest)] border border-[var(--border)] rounded-lg shadow-md px-1 py-0.5 z-10">
              <button
                onClick={() => setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id)}
                className="p-1 rounded hover:bg-[var(--surface-high)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--on-surface)]"
                title="Reagir"
              >
                <Smile className="h-3.5 w-3.5" />
              </button>
              {isMe && (
                <button
                  onClick={() => handleDelete(msg.id)}
                  className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-[var(--muted-foreground)] hover:text-red-500"
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Emoji picker */}
            {emojiPickerFor === msg.id && (
              <div className="absolute right-2 top-5 bg-[var(--surface-lowest)] border border-[var(--border)] rounded-xl shadow-xl p-2 z-20 w-[220px]">
                <div className="grid grid-cols-10 gap-0.5">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReact(msg.id, emoji)}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--surface-high)] transition-colors text-base"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message content */}
            {isConsecutive ? (
              <>
                <span className="invisible group-hover:visible text-[10px] text-muted-foreground mr-2">
                  {format(new Date(msg.createdAt), "HH:mm")}
                </span>
                <span className="text-sm">{msg.content}</span>
              </>
            ) : (
              <>
                <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                  <AvatarFallback className={`text-xs font-medium ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{msg.author?.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(msg.createdAt), "dd MMM HH:mm", { locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5">{msg.content}</p>
                </div>
              </>
            )}

            {/* Reactions */}
            {reactions.length > 0 && (
              <div className={`flex flex-wrap gap-1 mt-1 ${isConsecutive ? "" : "pl-11"}`}>
                {reactions.map((r) => {
                  const hasReacted = r.userIds.includes(currentUserId);
                  return (
                    <button
                      key={r.emoji}
                      onClick={() => handleReact(msg.id, r.emoji)}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                        hasReacted
                          ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]"
                          : "bg-[var(--surface-low)] border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--surface-high)]"
                      }`}
                    >
                      <span>{r.emoji}</span>
                      <span className="font-medium">{r.userIds.length}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
