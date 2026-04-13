"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { getSocket, connectSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { Loader2 } from "lucide-react";
import type { Message } from "@repo/types";

export default function DMPage() {
  const params = useParams();
  const currentUser = useAuthStore((s) => s.user);
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
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
          // Mark as read since we're viewing
          api.post(`/dm/${otherUserId}/read`).catch(() => {});
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

    return () => {
      socket.off("message:new");
      socket.off("message:dm:typing");
      socket.off("message:reacted");
      socket.off("message:deleted");
    };
  }, [otherUserId, currentUser?.id]);

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
    <div className="flex h-full flex-col">
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
        placeholder={`Message ${otherName}...`}
      />
    </div>
  );
}
