"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Loader2, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { getSocket, connectSocket } from "@/lib/socket";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChatInput } from "./chat-input";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Message } from "@repo/types";

interface Props {
  parentMessage: Message;
  channelId?: string;
  dmUserId?: string;
  currentUserId: string;
  onClose: () => void;
}

export function ThreadPanel({ parentMessage, channelId, dmUserId, currentUserId, onClose }: Props) {
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/messages/${parentMessage.id}/replies`)
      .then(({ data }) => setReplies(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [parentMessage.id]);

  useEffect(() => {
    const socket = connectSocket();

    const handleNewReply = (data: { message: Message; parentId: string }) => {
      if (data.parentId === parentMessage.id) {
        setReplies((prev) => [...prev, data.message]);
      }
    };

    socket.on("message:reply:new", handleNewReply);
    return () => { socket.off("message:reply:new", handleNewReply); };
  }, [parentMessage.id]);

  const handleSend = useCallback((content: string) => {
    const socket = getSocket();
    socket.emit("message:reply", {
      parentId: parentMessage.id,
      content,
      channelId,
      dmUserId,
    });
  }, [parentMessage.id, channelId, dmUserId]);

  const initials = (name?: string) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <div className="w-full md:w-96 shrink-0 border-l border-[var(--border)] flex flex-col bg-[var(--background)] h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[var(--primary)]" />
          <h3 className="text-sm font-bold">Thread</h3>
          <span className="text-xs text-[var(--muted-foreground)]">
            {replies.length} reponse{replies.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--surface-high)] transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Parent message */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-low)]">
        <div className="flex gap-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs font-medium bg-primary text-primary-foreground">
              {initials(parentMessage.author?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold">{parentMessage.author?.name}</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {format(new Date(parentMessage.createdAt), "dd MMM HH:mm", { locale: fr })}
              </span>
            </div>
            <p className="text-sm mt-0.5">{parentMessage.content}</p>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : replies.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)] text-center py-8">
            Aucune reponse. Soyez le premier !
          </p>
        ) : (
          replies.map((reply) => {
            const isMe = reply.authorId === currentUserId;
            return (
              <div key={reply.id} className="flex gap-2.5">
                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                  <AvatarFallback className={`text-[10px] font-medium ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {initials(reply.author?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold">{reply.author?.name}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {format(new Date(reply.createdAt), "HH:mm", { locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5">{reply.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply input */}
      <ChatInput
        onSend={handleSend}
        onTyping={() => {}}
        placeholder="Repondre..."
      />
    </div>
  );
}
