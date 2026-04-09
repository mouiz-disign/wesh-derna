"use client";

import { useState, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onSend: (content: string) => void;
  onTyping: () => void;
  placeholder?: string;
}

export function ChatInput({ onSend, onTyping, placeholder }: Props) {
  const [value, setValue] = useState("");
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    // Throttle typing events to 1 per 2s
    if (!typingTimer.current) {
      onTyping();
      typingTimer.current = setTimeout(() => {
        typingTimer.current = null;
      }, 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t px-6 py-3">
      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1 focus-within:ring-1 focus-within:ring-ring">
        <input
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Ecrire un message..."}
          className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          disabled={!value.trim()}
          className="h-8 w-8 p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
