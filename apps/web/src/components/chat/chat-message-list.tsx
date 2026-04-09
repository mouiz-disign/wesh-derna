"use client";

import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Message } from "@repo/types";

interface Props {
  messages: Message[];
  currentUserId: string;
}

export function ChatMessageList({ messages, currentUserId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Aucun message. Commencez la conversation !
        </p>
      </div>
    );
  }

  // Group consecutive messages from same author
  let lastAuthorId = "";
  let lastTime = "";

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      {messages.map((msg, i) => {
        const isConsecutive =
          msg.authorId === lastAuthorId &&
          lastTime &&
          new Date(msg.createdAt).getTime() - new Date(lastTime).getTime() <
            5 * 60 * 1000;

        lastAuthorId = msg.authorId;
        lastTime = msg.createdAt;

        const initials = msg.author?.name
          ?.split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        const isMe = msg.authorId === currentUserId;

        if (isConsecutive) {
          return (
            <div key={msg.id} className="group pl-10 py-0.5 hover:bg-muted/30 rounded-md">
              <span className="invisible group-hover:visible text-[10px] text-muted-foreground mr-2">
                {format(new Date(msg.createdAt), "HH:mm")}
              </span>
              <span className="text-sm">{msg.content}</span>
            </div>
          );
        }

        return (
          <div key={msg.id} className={`flex gap-3 py-2 hover:bg-muted/30 rounded-md ${i > 0 ? "mt-2" : ""}`}>
            <Avatar className="h-8 w-8 shrink-0 mt-0.5">
              <AvatarFallback
                className={`text-xs font-medium ${
                  isMe
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">
                  {msg.author?.name}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {format(new Date(msg.createdAt), "dd MMM HH:mm", {
                    locale: fr,
                  })}
                </span>
              </div>
              <p className="text-sm mt-0.5">{msg.content}</p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
