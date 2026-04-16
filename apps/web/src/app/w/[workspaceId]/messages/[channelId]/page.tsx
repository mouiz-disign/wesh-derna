"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { getSocket, connectSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth-store";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { ThreadPanel } from "@/components/chat/thread-panel";
import { Hash, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { playMessageSound } from "@/lib/sounds";
import type { Message, Channel } from "@repo/types";

export default function ChannelPage() {
  const params = useParams();
  const user = useAuthStore((s) => s.user);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
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
        if (data.message.authorId !== user?.id) {
          playMessageSound();
          socket.emit("message:mark-read", { messageIds: [data.message.id], channelId });
        }
      }
    });

    socket.on("message:read", (data: { messageIds: string[]; userId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          data.messageIds.includes(m.id)
            ? { ...m, readBy: [...((m.readBy as string[]) || []), data.userId] }
            : m,
        ),
      );
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

    socket.on("thread:updated", (data: { parentId: string; replyCount: number }) => {
      setMessages((prev) =>
        prev.map((m) => m.id === data.parentId ? { ...m, _count: { ...m._count, replies: data.replyCount } } : m),
      );
    });

    return () => {
      socket.emit("leave:channel", { channelId });
      socket.off("message:new");
      socket.off("message:typing");
      socket.off("message:reacted");
      socket.off("message:deleted");
      socket.off("thread:updated");
      socket.off("message:read");
    };
  }, [channelId, user?.id]);

  // Mark existing messages as read on load
  useEffect(() => {
    if (messages.length > 0 && user?.id) {
      const unreadIds = messages.filter((m) => m.authorId !== user.id && !((m.readBy as string[]) || []).includes(user.id)).map((m) => m.id);
      if (unreadIds.length > 0) {
        const socket = getSocket();
        socket.emit("message:mark-read", { messageIds: unreadIds, channelId });
      }
    }
  }, [messages.length, channelId, user?.id]);

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
    <div className="flex h-full">
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center gap-2 border-b px-6 py-3">
          <Hash className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">{channel?.name || "Channel"}</h2>
        </div>

        <ChatMessageList
          messages={messages}
          currentUserId={user?.id || ""}
          channelId={channelId}
          onOpenThread={(msg) => setThreadMessage(msg)}
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
        onFileUpload={async (file, content) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("content", content);
          formData.append("channelId", channelId);
          try {
            const { data } = await api.post("/messages/upload", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            // Broadcast via socket
            const socket = getSocket();
            socket.emit("join:channel", { channelId });
            setMessages((prev) => [...prev, data]);
          } catch { toast.error("Erreur upload"); }
        }}
        placeholder={`Message #${channel?.name || "channel"}...`}
      />
      </div>

      {/* Thread panel */}
      {threadMessage && (
        <ThreadPanel
          parentMessage={threadMessage}
          channelId={channelId}
          currentUserId={user?.id || ""}
          onClose={() => setThreadMessage(null)}
        />
      )}
    </div>
  );
}
