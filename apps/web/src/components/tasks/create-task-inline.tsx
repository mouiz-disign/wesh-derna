"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, X, Calendar, User, Flag, ChevronDown, Mic } from "lucide-react";
import type { UserPreview } from "@repo/types";
import { VoiceRecorder, VoicePlayer } from "@/components/tasks/voice-recorder";

const priorities = [
  { value: "LOW", label: "Basse", color: "bg-slate-400" },
  { value: "MEDIUM", label: "Moyenne", color: "bg-blue-500" },
  { value: "HIGH", label: "Haute", color: "bg-orange-500" },
  { value: "URGENT", label: "Urgente", color: "bg-red-500" },
];

interface Props {
  columnId: string;
  projectId: string;
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateTaskInline({ columnId, projectId, onCreated, onCancel }: Props) {
  const params = useParams();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [deadline, setDeadline] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [members, setMembers] = useState<UserPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    api
      .get(`/workspaces/${params.workspaceId}`)
      .then(({ data }) => {
        const users = data.members?.map((m: any) => m.user) || [];
        setMembers(users);
      })
      .catch(() => {});
  }, [params.workspaceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const { data: task } = await api.post("/tasks", {
        title: title.trim(),
        columnId,
        projectId,
        priority,
        deadline: deadline || undefined,
        assigneeId: assigneeId || undefined,
      });

      // Upload voice note if recorded
      if (voiceBlob) {
        const formData = new FormData();
        formData.append("file", voiceBlob, "voice-note.webm");
        await api.post(`/tasks/${task.id}/voice-note`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
      toast.success("Tache creee");
      onCreated();
    } catch {
      toast.error("Erreur lors de la creation");
    } finally {
      setLoading(false);
    }
  };

  const selectedPriority = priorities.find((p) => p.value === priority)!;
  const selectedMember = members.find((m) => m.id === assigneeId);

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl bg-[var(--surface-lowest)] p-4 shadow-executive space-y-3"
    >
      {/* Title */}
      <Input
        autoFocus
        placeholder="Titre de la tache..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        className="border-none bg-transparent text-sm font-semibold p-0 h-auto shadow-none focus-visible:ring-0 placeholder:text-[var(--muted-foreground)]"
      />

      {/* Options row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Priority */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const idx = priorities.findIndex((p) => p.value === priority);
              setPriority(priorities[(idx + 1) % priorities.length]!.value);
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[var(--surface-low)] hover:bg-[var(--surface-high)] transition-colors"
          >
            <div className={`h-2 w-2 rounded-full ${selectedPriority.color}`} />
            {selectedPriority.label}
          </button>
        </div>

        {/* Assignee */}
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="px-2 py-1 rounded-lg text-[11px] font-medium bg-[var(--surface-low)] border-none cursor-pointer hover:bg-[var(--surface-high)] transition-colors"
        >
          <option value="">Non assigne</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        {/* Deadline */}
        <div className="relative">
          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[var(--muted-foreground)] pointer-events-none" />
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="pl-6 pr-2 py-1 rounded-lg text-[11px] font-medium bg-[var(--surface-low)] border-none cursor-pointer hover:bg-[var(--surface-high)] transition-colors"
          />
        </div>
      </div>

      {/* Voice note */}
      {voicePreviewUrl ? (
        <VoicePlayer
          src={voicePreviewUrl}
          onRemove={() => {
            setVoiceBlob(null);
            if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
            setVoicePreviewUrl(null);
          }}
        />
      ) : (
        <VoiceRecorder
          onRecorded={(blob) => {
            setVoiceBlob(blob);
            setVoicePreviewUrl(URL.createObjectURL(blob));
          }}
          disabled={loading}
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="px-4 py-1.5 gradient-primary text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-all hover:shadow-md"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ajouter"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface-high)] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
