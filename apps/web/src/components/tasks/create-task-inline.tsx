"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

interface Props {
  columnId: string;
  projectId: string;
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateTaskInline({ columnId, projectId, onCreated, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await api.post("/tasks", {
        title: title.trim(),
        columnId,
        projectId,
      });
      toast.success("Tache creee");
      onCreated();
    } catch {
      toast.error("Erreur lors de la creation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-background p-2">
      <Input
        autoFocus
        placeholder="Titre de la tache..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        className="mb-2 h-8 text-sm"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={loading || !title.trim()} className="h-7 text-xs">
          {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
          Ajouter
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
