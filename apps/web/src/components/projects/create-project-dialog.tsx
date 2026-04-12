"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import type { WorkspaceMember } from "@repo/types";

const COLORS = [
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateProjectDialog({ open, onOpenChange, onCreated }: Props) {
  const params = useParams();
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const currentUser = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]!);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  const members = (workspace?.members || []).filter(
    (m: WorkspaceMember) => m.userId !== currentUser?.id,
  );

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/workspaces/${params.workspaceId}/projects`, {
        name,
        description: description || undefined,
        color,
        memberIds: selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
      });
      toast.success("Projet cree !");
      setName("");
      setDescription("");
      setColor(COLORS[0]!);
      setSelectedMemberIds([]);
      setShowMemberPicker(false);
      onCreated();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de la creation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau projet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="project-name" className="text-sm font-medium">
              Nom du projet
            </label>
            <Input
              id="project-name"
              placeholder="Sprint 1"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="project-desc" className="text-sm font-medium">
              Description (optionnel)
            </label>
            <Input
              id="project-desc"
              placeholder="Description du projet..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Couleur</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-all ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-primary scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Members section */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Membres</label>

            {/* Selected members */}
            {selectedMemberIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMemberIds.map((userId) => {
                  const member = members.find((m: WorkspaceMember) => m.userId === userId);
                  if (!member) return null;
                  const initials = member.user.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <div
                      key={userId}
                      className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-[var(--surface-high)] text-xs font-medium"
                    >
                      <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-[8px] font-bold text-white">
                        {initials}
                      </div>
                      <span className="truncate max-w-[100px]">{member.user.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleMember(userId)}
                        className="p-0.5 rounded-full hover:bg-[var(--surface-low)] transition-colors"
                      >
                        <X className="h-3 w-3 text-[var(--muted-foreground)]" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add member button / picker */}
            {!showMemberPicker ? (
              <button
                type="button"
                onClick={() => setShowMemberPicker(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
              >
                <Plus className="h-4 w-4" />
                Ajouter des membres
              </button>
            ) : (
              <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                <div className="max-h-40 overflow-y-auto">
                  {members.length === 0 ? (
                    <p className="p-3 text-xs text-[var(--muted-foreground)] text-center">
                      Aucun autre membre dans l&apos;equipe
                    </p>
                  ) : (
                    members.map((member: WorkspaceMember) => {
                      const isSelected = selectedMemberIds.includes(member.userId);
                      const initials = member.user.name
                        ?.split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);
                      return (
                        <button
                          key={member.userId}
                          type="button"
                          onClick={() => toggleMember(member.userId)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--surface-low)] transition-colors ${
                            isSelected ? "bg-[var(--primary)]/5" : ""
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{member.user.name}</p>
                            <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                              {member.user.email}
                            </p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-[var(--primary)] border-[var(--primary)]"
                                : "border-[var(--border)]"
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowMemberPicker(false)}
                  className="w-full px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] bg-[var(--surface-low)] hover:bg-[var(--surface-high)] transition-colors border-t border-[var(--border)]"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Creer le projet
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
