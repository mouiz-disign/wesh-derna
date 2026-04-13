"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { getSocket, connectSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth-store";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { Hash, Loader2 } from "lucide-react";
import type { Message, Channel } from "@repo/types";

export default function ChannelPage() {
  const params = useParams();
  const user = useAuthStore((s) => s.user);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeout = useRef<Record<string, NodeJS.Timeout>>({});

  const channelId = params.channelId as string;

  useEffect(() => {
    const load = async () => {
      try {
        const [chanRes, msgRes] = await Promise.all([
          api.get(`/workspaces/${params.workspaceId}/channels`),
          api.get(`/channels/${channelId}/messages`),
        ]);
        const ch = chanRes.data.find((c: Channel) => c.id === channelId);
        setChannel(ch || null);
        setMessages(msgRes.data);
        // Mark as read
        api.post(`/channels/${channelId}/read`).catch(() => {});
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, [channelId, params.workspaceId]);

  useEffect(() => {
    const socket = connectSocket();

    socket.emit("join:channel", { channelId });

    socket.on("message:new", (data: { message: Message }) => {
      if (data.message.channelId === channelId) {
        setMessages((prev) => [...prev, data.message]);
        api.post(`/channels/${channelId}/read`).catch(() => {});
      }
    });

    socket.on("message:typing", (data: { channelId: string; userName: string; userId: string }) => {
      if (data.channelId === channelId && data.userId !== user?.id) {
        setTypingUsers((prev) => prev.includes(data.userName) ? prev : [...prev, data.userName]);
        if (typingTimeout.current[data.userId]) clearTimeout(typingTimeout.current[data.userId]);
        typingTimeout.current[data.userId] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((n) => n !== data.userName));
        }, 3000);
      }
    });

    socket.on("message:reacted", (data: { messageId: string; reactions: any[] }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m)),
      );
    });

    socket.on("message:deleted", (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    });

    return () => {
      socket.emit("leave:channel", { channelId });
      socket.off("message:new");
      socket.off("message:typing");
      socket.off("message:reacted");
      socket.off("message:deleted");
    };
  }, [channelId, user?.id]);

  const handleSend = useCallback((content: string) => {
    const socket = getSocket();
    socket.emit("message:send", { content, channelId });
  }, [channelId]);

  const handleTyping = useCallback(() => {
    const socket = getSocket();
    socket.emit("message:typing", { channelId });
  }, [channelId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-6 py-3">
        <Hash className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold">{channel?.name || "Channel"}</h2>
      </div>

      <ChatMessageList
        messages={messages}
        currentUserId={user?.id || ""}
        channelId={channelId}
      />

      {typingUsers.length > 0 && (
        <div className="px-6 py-1 text-xs text-muted-foreground animate-pulse">
          {typingUsers.join(", ")}{" "}
          {typingUsers.length === 1 ? "est en train d'ecrire..." : "sont en train d'ecrire..."}
        </div>
      )}

      <ChatInput
        onSend={handleSend}
        onTyping={handleTyping}
        placeholder={`Message #${channel?.name || "channel"}...`}
      />
    </div>
  );
}
