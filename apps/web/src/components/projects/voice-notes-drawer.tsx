"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { playNotifSound } from "@/lib/sounds";
import { VoicePlayer } from "@/components/tasks/voice-recorder";
import {
  Mic,
  X,
  Square,
  Trash2,
  Plus,
  Link2,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { VoiceNote, Column } from "@repo/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Props {
  projectId: string;
  columns: Column[];
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function VoiceNotesDrawer({ projectId, columns, open, onClose, onRefresh }: Props) {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "free" | "linked">("all");
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertForm, setConvertForm] = useState({ title: "", columnId: "", priority: "MEDIUM" });
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const { data } = await api.get(`/projects/${projectId}/voice-notes`);
      setNotes(data);
    } catch {} finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) fetchNotes();
  }, [open, fetchNotes]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/voice-notes/${id}`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Note supprimee");
    } catch { toast.error("Erreur"); }
  };

  const handleConvert = async (noteId: string) => {
    if (!convertForm.title.trim() || !convertForm.columnId) return;
    try {
      await api.post(`/voice-notes/${noteId}/convert`, {
        title: convertForm.title.trim(),
        columnId: convertForm.columnId,
        priority: convertForm.priority,
      });
      toast.success("Tache creee depuis la note vocale");
      setConvertingId(null);
      setConvertForm({ title: "", columnId: "", priority: "MEDIUM" });
      fetchNotes();
      onRefresh();
    } catch { toast.error("Erreur"); }
  };

  const handleLink = async (noteId: string, taskId: string) => {
    try {
      await api.patch(`/voice-notes/${noteId}/link`, { taskId });
      toast.success("Note rattachee a la tache");
      setLinkingId(null);
      fetchNotes();
    } catch { toast.error("Erreur"); }
  };

  const allTasks = columns.flatMap((c) => c.tasks);
  const filtered = notes.filter((n) => {
    if (filter === "free") return !n.taskId;
    if (filter === "linked") return !!n.taskId;
    return true;
  });
  const freeCount = notes.filter((n) => !n.taskId).length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-[var(--background)] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-base font-bold">Notes vocales</h2>
            {freeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {freeCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-high)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-[var(--border)]">
          {(["all", "free", "linked"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filter === f ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-low)] text-[var(--muted-foreground)] hover:bg-[var(--surface-high)]"}`}
            >
              {f === "all" ? "Toutes" : f === "free" ? "Non traitees" : "Traitees"}
            </button>
          ))}
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <Mic className="h-8 w-8 mx-auto mb-2 text-[var(--muted-foreground)]" />
              <p className="text-sm text-[var(--muted-foreground)]">
                {filter === "free" ? "Aucune note en attente" : "Aucune note vocale"}
              </p>
            </div>
          ) : (
            filtered.map((note) => {
              const initials = note.author?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
              return (
                <div key={note.id} className="rounded-xl border border-[var(--border)] p-3 space-y-2">
                  {/* Author + time */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-[8px] font-bold text-white">
                      {initials}
                    </div>
                    <span className="text-xs font-semibold">{note.author?.name}</span>
                    <span className="text-[10px] text-[var(--muted-foreground)] ml-auto">
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: fr })}
                    </span>
                  </div>

                  {/* Player */}
                  <VoicePlayer src={`${API_URL}${note.url}`} />

                  {/* Linked task */}
                  {note.task && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                      <Link2 className="h-3 w-3" />
                      Liee a : {note.task.title}
                    </div>
                  )}

                  {/* Actions for free notes */}
                  {!note.taskId && (
                    <div className="flex items-center gap-2">
                      {convertingId === note.id ? (
                        <div className="flex-1 space-y-2">
                          <input
                            autoFocus
                            value={convertForm.title}
                            onChange={(e) => setConvertForm((p) => ({ ...p, title: e.target.value }))}
                            placeholder="Titre de la tache..."
                            className="w-full h-8 px-3 text-sm rounded-lg bg-[var(--surface-low)] border-none outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
                          />
                          <div className="flex gap-2">
                            <select
                              value={convertForm.columnId}
                              onChange={(e) => setConvertForm((p) => ({ ...p, columnId: e.target.value }))}
                              className="flex-1 h-8 px-2 text-xs rounded-lg bg-[var(--surface-low)] border-none"
                            >
                              <option value="">Colonne...</option>
                              {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select
                              value={convertForm.priority}
                              onChange={(e) => setConvertForm((p) => ({ ...p, priority: e.target.value }))}
                              className="h-8 px-2 text-xs rounded-lg bg-[var(--surface-low)] border-none"
                            >
                              <option value="LOW">Basse</option>
                              <option value="MEDIUM">Moyenne</option>
                              <option value="HIGH">Haute</option>
                              <option value="URGENT">Urgente</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleConvert(note.id)} disabled={!convertForm.title.trim() || !convertForm.columnId} className="flex-1 h-8 gradient-primary text-white rounded-lg text-xs font-bold disabled:opacity-40">
                              Creer
                            </button>
                            <button onClick={() => setConvertingId(null)} className="h-8 px-3 text-xs rounded-lg bg-[var(--surface-low)]">
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : linkingId === note.id ? (
                        <div className="flex-1 space-y-1 max-h-32 overflow-y-auto">
                          {allTasks.map((t) => (
                            <button key={t.id} onClick={() => handleLink(note.id, t.id)} className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-[var(--surface-low)] truncate">
                              {t.title}
                            </button>
                          ))}
                          <button onClick={() => setLinkingId(null)} className="w-full text-center text-xs text-[var(--muted-foreground)] py-1">
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => { setConvertingId(note.id); setConvertForm({ title: "", columnId: columns[0]?.id || "", priority: "MEDIUM" }); }}
                            className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg text-xs font-semibold gradient-primary text-white"
                          >
                            <Plus className="h-3 w-3" />
                            Creer tache
                          </button>
                          <button
                            onClick={() => setLinkingId(note.id)}
                            className="flex items-center justify-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold bg-[var(--surface-low)] text-[var(--muted-foreground)] hover:bg-[var(--surface-high)]"
                          >
                            <Link2 className="h-3 w-3" />
                            Rattacher
                          </button>
                          <button onClick={() => handleDelete(note.id)} className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
