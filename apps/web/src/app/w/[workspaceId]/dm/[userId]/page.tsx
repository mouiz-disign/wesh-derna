"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { getSocket, connectSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { ThreadPanel } from "@/components/chat/thread-panel";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { playMessageSound } from "@/lib/sounds";
import type { Message } from "@repo/types";

export default function DMPage() {
  const params = useParams();
  const currentUser = useAuthStore((s) => s.user);
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const typingTimeout = useRef<Record<string, NodeJS.Timeout>>({});

  const otherUserId = params.userId as string;

  // Find the other user's info from workspace members
  const otherUser = workspace?.members?.find((m: any) => m.userId === otherUserId)?.user;
  const otherName = otherUser?.name || "Utilisateur";
  const otherInitials = otherName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  // Load messages
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/dm/${otherUserId}`);
        setMessages(data);
        // Mark as read
        api.post(`/dm/${otherUserId}/read`).catch(() => {});
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, [otherUserId]);

  // Socket
  useEffect(() => {
    const socket = connectSocket();

    socket.emit("join:dm", { otherUserId });

    socket.on("message:new", (data: { message: Message }) => {
      // Only add if it's a DM between us
      if (!data.message.channelId) {
        const isOurDM =
          (data.message.authorId === currentUser?.id && data.message.dmTo === otherUserId) ||
          (data.message.authorId === otherUserId && data.message.dmTo === currentUser?.id);
        if (isOurDM) {
          setMessages((prev) => [...prev, data.message]);
          api.post(`/dm/${otherUserId}/read`).catch(() => {});
          if (data.message.authorId !== currentUser?.id) {
            playMessageSound();
            socket.emit("message:mark-read", { messageIds: [data.message.id], dmUserId: otherUserId });
          }
        }
      }
    });

    socket.on("message:dm:typing", (data: { userId: string; userName: string }) => {
      if (data.userId !== currentUser?.id) {
        setTypingUsers((prev) =>
          prev.includes(data.userName) ? prev : [...prev, data.userName],
        );
        if (typingTimeout.current[data.userId]) {
          clearTimeout(typingTimeout.current[data.userId]);
        }
        typingTimeout.current[data.userId] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((n) => n !== data.userName));
        }, 3000);
      }
    });

    // Listen for reactions & deletions
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

    socket.on("message:read", (data: { messageIds: string[]; userId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          data.messageIds.includes(m.id)
            ? { ...m, readBy: [...((m.readBy as string[]) || []), data.userId] }
            : m,
        ),
      );
    });

    return () => {
      socket.off("message:new");
      socket.off("message:dm:typing");
      socket.off("message:reacted");
      socket.off("message:deleted");
      socket.off("thread:updated");
      socket.off("message:read");
    };
  }, [otherUserId, currentUser?.id]);

  // Mark existing messages as read on load
  useEffect(() => {
    if (messages.length > 0 && currentUser?.id) {
      const unreadIds = messages
        .filter((m) => m.authorId !== currentUser.id && !((m.readBy as string[]) || []).includes(currentUser.id))
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        const socket = getSocket();
        socket.emit("message:mark-read", { messageIds: unreadIds, dmUserId: otherUserId });
      }
    }
  }, [messages.length, otherUserId, currentUser?.id]);

  const handleSend = useCallback(
    (content: string) => {
      const socket = getSocket();
      socket.emit("message:dm", { content, toUserId: otherUserId });
    },
    [otherUserId],
  );

  const handleTyping = useCallback(() => {
    const socket = getSocket();
    socket.emit("message:dm:typing", { toUserId: otherUserId });
  }, [otherUserId]);

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
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-6 py-3">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-[11px] font-bold text-white">
            {otherInitials}
          </div>
          <h2 className="font-semibold">{otherName}</h2>
        </div>

        {/* Messages */}
        <ChatMessageList
          messages={messages}
          currentUserId={currentUser?.id || ""}
          dmUserId={otherUserId}
          onOpenThread={(msg) => setThreadMessage(msg)}
        />

      {/* Typing */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-1 text-xs text-muted-foreground animate-pulse">
          {typingUsers.join(", ")} est en train d&apos;ecrire...
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onTyping={handleTyping}
        onFileUpload={async (file, content) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("content", content);
          formData.append("dmTo", otherUserId);
          try {
            const { data } = await api.post("/messages/upload", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            setMessages((prev) => [...prev, data]);
          } catch { toast.error("Erreur upload"); }
        }}
        placeholder={`Message ${otherName}...`}
      />
      </div>

      {threadMessage && (
        <ThreadPanel
          parentMessage={threadMessage}
          dmUserId={otherUserId}
          currentUserId={currentUser?.id || ""}
          onClose={() => setThreadMessage(null)}
        />
      )}
    </div>
  );
}
