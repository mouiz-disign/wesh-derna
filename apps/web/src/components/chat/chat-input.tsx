"use client";

import { useState, useRef } from "react";
import { Send, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onSend: (content: string) => void;
  onTyping: () => void;
  onFileUpload?: (file: File, content: string) => void;
  placeholder?: string;
}

export function ChatInput({ onSend, onTyping, onFileUpload, placeholder }: Props) {
  const [value, setValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile && onFileUpload) {
      onFileUpload(selectedFile, value.trim());
      setSelectedFile(null);
      setValue("");
      return;
    }
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isImage = selectedFile?.type.startsWith("image/");

  return (
    <form onSubmit={handleSubmit} className="border-t px-6 py-3">
      {/* File preview */}
      {selectedFile && (
        <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-[var(--surface-low)]">
          {isImage ? (
            <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
          ) : (
            <FileText className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
          )}
          <span className="text-xs font-medium truncate flex-1">{selectedFile.name}</span>
          <span className="text-[10px] text-[var(--muted-foreground)]">
            {(selectedFile.size / 1024).toFixed(0)} Ko
          </span>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="p-0.5 rounded text-[var(--muted-foreground)] hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1 focus-within:ring-1 focus-within:ring-ring">
        {/* File attach button */}
        {onFileUpload && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
              title="Joindre un fichier"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
          </>
        )}

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
          disabled={!value.trim() && !selectedFile}
          className="h-8 w-8 p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
