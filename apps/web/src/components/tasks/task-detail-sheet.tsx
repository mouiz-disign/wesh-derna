"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  MessageSquare,
  Loader2,
  Send,
  Trash2,
  Clock,
  ListChecks,
  Plus,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Task, Comment, UserPreview } from "@repo/types";

const priorityOptions = [
  { value: "LOW", label: "Basse", dot: "bg-slate-400", bg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300" },
  { value: "MEDIUM", label: "Moyenne", dot: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
  { value: "HIGH", label: "Haute", dot: "bg-orange-500", bg: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" },
  { value: "URGENT", label: "Urgente", dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300" },
];

interface Props {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function TaskDetailSheet({ taskId, open, onOpenChange, onUpdated }: Props) {
  const params = useParams();
  const [task, setTask] = useState<(Task & { comments: Comment[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [members, setMembers] = useState<UserPreview[]>([]);
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; done: boolean }[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);

  useEffect(() => {
    if (!taskId || !open) return;
    setLoading(true);
    Promise.all([
      api.get(`/tasks/${taskId}`),
      api.get(`/workspaces/${params.workspaceId}`),
    ])
      .then(([taskRes, wsRes]) => {
        setTask(taskRes.data);
        setTitle(taskRes.data.title);
        setDescription(taskRes.data.description || "");
        setMembers(wsRes.data.members?.map((m: any) => m.user) || []);
        setSubtasks(taskRes.data.subtasks || []);
      })
      .catch(() => toast.error("Erreur chargement"))
      .finally(() => setLoading(false));
  }, [taskId, open, params.workspaceId]);

  const updateField = async (field: string, value: string | null) => {
    if (!taskId) return;
    try {
      const { data } = await api.put(`/tasks/${taskId}`, { [field]: value });
      setTask((prev) => (prev ? { ...prev, ...data } : null));
      onUpdated();
    } catch {
      toast.error("Erreur mise a jour");
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !taskId) return;
    setSendingComment(true);
    try {
      const { data } = await api.post(`/tasks/${taskId}/comments`, { content: comment.trim() });
      setTask((prev) => (prev ? { ...prev, comments: [...prev.comments, data] } : null));
      setComment("");
    } catch {
      toast.error("Erreur envoi");
    } finally {
      setSendingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    await api.delete(`/tasks/${taskId}`);
    toast.success("Tache supprimee");
    onOpenChange(false);
    onUpdated();
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim() || !taskId) return;
    try {
      const { data } = await api.post(`/tasks/${taskId}/subtasks`, { title: newSubtask.trim() });
      setSubtasks((prev) => [...prev, data]);
      setNewSubtask("");
    } catch {
      toast.error("Erreur");
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    try {
      const { data } = await api.patch(`/tasks/subtasks/${subtaskId}/toggle`);
      setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? data : s)));
    } catch {
      toast.error("Erreur");
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await api.delete(`/tasks/subtasks/${subtaskId}`);
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    } catch {
      toast.error("Erreur");
    }
  };

  const subtasksDone = subtasks.filter((s) => s.done).length;
  const subtasksTotal = subtasks.length;
  const subtaskProgress = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  const currentPriority = priorityOptions.find((p) => p.value === task?.priority) || priorityOptions[1]!;
  const assignee = task?.assignee;
  const initials = assignee?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const isOverdue = task?.deadline && new Date(task.deadline) < new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0 border-0 shadow-2xl rounded-2xl">
        {loading || !task ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Detail tache</DialogTitle>
            </DialogHeader>

            {/* Top color bar */}
            <div className={`h-1.5 w-full ${currentPriority.dot}`} />

            <div className="flex flex-col lg:flex-row min-h-[400px]">
              {/* Left — Main content */}
              <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                {/* Title */}
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => title !== task.title && title.trim() && updateField("title", title)}
                  className="w-full text-xl font-headline font-bold bg-transparent outline-none placeholder:text-[var(--muted-foreground)]"
                  placeholder="Titre de la tache"
                />

                {/* Description */}
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => description !== (task.description || "") && updateField("description", description)}
                  placeholder="Ajouter une description..."
                  className="w-full resize-none rounded-xl bg-[var(--surface-low)] px-4 py-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 border-none placeholder:text-[var(--muted-foreground)] leading-relaxed"
                />

                {/* Subtasks */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] flex items-center gap-2">
                      <ListChecks className="h-3.5 w-3.5" />
                      Sous-taches ({subtasksDone}/{subtasksTotal})
                    </h4>
                    <button
                      onClick={() => setShowSubtaskInput(true)}
                      className="flex items-center gap-1 text-[11px] font-medium text-[var(--primary)] hover:bg-[var(--surface-low)] px-2 py-1 rounded-lg transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Ajouter
                    </button>
                  </div>

                  {/* Progress bar */}
                  {subtasksTotal > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-high)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${subtaskProgress}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
                        {subtaskProgress}%
                      </span>
                    </div>
                  )}

                  {/* Subtask list */}
                  <div className="space-y-1">
                    {subtasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center gap-2.5 group py-1.5 px-2 rounded-lg hover:bg-[var(--surface-low)] transition-colors"
                      >
                        <button
                          onClick={() => handleToggleSubtask(st.id)}
                          className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                            st.done
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-[var(--muted-foreground)]/40 hover:border-[var(--primary)]"
                          }`}
                        >
                          {st.done && (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span
                          className={`flex-1 text-sm ${
                            st.done ? "line-through text-[var(--muted-foreground)]" : ""
                          }`}
                        >
                          {st.title}
                        </span>
                        <button
                          onClick={() => handleDeleteSubtask(st.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--muted-foreground)] hover:text-red-500 transition-all"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add subtask input */}
                  {showSubtaskInput && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        autoFocus
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddSubtask();
                          if (e.key === "Escape") { setShowSubtaskInput(false); setNewSubtask(""); }
                        }}
                        placeholder="Nouvelle sous-tache..."
                        className="flex-1 h-8 px-3 text-sm rounded-lg bg-[var(--surface-low)] border-none outline-none focus:ring-2 focus:ring-[var(--primary)]/30 placeholder:text-[var(--muted-foreground)]"
                      />
                      <button
                        onClick={handleAddSubtask}
                        disabled={!newSubtask.trim()}
                        className="h-8 px-3 gradient-primary text-white rounded-lg text-xs font-bold disabled:opacity-40"
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-3 flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Commentaires ({task.comments?.length || 0})
                  </h4>

                  {task.comments?.length > 0 && (
                    <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                      {task.comments.map((c) => (
                        <div key={c.id} className="flex gap-2.5">
                          <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">
                            {c.author.name?.split(" ").map((n) => n[0]).join("").toUpperCase()}
                          </div>
                          <div className="flex-1 bg-[var(--surface-low)] rounded-xl px-3 py-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-bold">{c.author.name}</span>
                              <span className="text-[10px] text-[var(--muted-foreground)]">
                                {format(new Date(c.createdAt), "dd MMM HH:mm", { locale: fr })}
                              </span>
                            </div>
                            <p className="text-sm mt-0.5">{c.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSendComment} className="flex gap-2">
                    <input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Ecrire un commentaire..."
                      className="flex-1 h-9 px-3 text-sm rounded-xl bg-[var(--surface-low)] border-none outline-none focus:ring-2 focus:ring-[var(--primary)]/30 placeholder:text-[var(--muted-foreground)]"
                    />
                    <button
                      type="submit"
                      disabled={sendingComment || !comment.trim()}
                      className="h-9 w-9 flex items-center justify-center gradient-primary text-white rounded-xl disabled:opacity-40 transition-all hover:shadow-md"
                    >
                      {sendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right — Sidebar info */}
              <div className="w-full lg:w-60 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--surface-low)] p-5 space-y-5">
                {/* Priority */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2 block">
                    Priorite
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {priorityOptions.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => updateField("priority", p.value)}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-all ${
                          task.priority === p.value
                            ? p.bg + " ring-2 ring-offset-1 ring-current"
                            : "bg-[var(--background)] text-[var(--muted-foreground)] hover:bg-[var(--surface-high)]"
                        }`}
                      >
                        <div className={`h-2 w-2 rounded-full ${p.dot}`} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assignee */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2 block">
                    Assigne a
                  </label>
                  {assignee && (
                    <div className="flex items-center gap-2.5 mb-2 p-2 rounded-lg bg-[var(--background)]">
                      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-[11px] font-bold text-white">
                        {initials}
                      </div>
                      <p className="text-sm font-semibold truncate flex-1">{assignee.name}</p>
                    </div>
                  )}
                  <select
                    value={task.assigneeId || ""}
                    onChange={(e) => updateField("assigneeId", e.target.value || null)}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--background)] border border-[var(--border)] cursor-pointer focus:ring-2 focus:ring-[var(--primary)]/30 focus:outline-none"
                  >
                    <option value="">Non assigne</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Deadline */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2 block">
                    Echeance
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
                    <input
                      type="date"
                      value={task.deadline ? new Date(task.deadline).toISOString().split("T")[0] : ""}
                      onChange={(e) => updateField("deadline", e.target.value || null)}
                      className={`w-full pl-10 pr-3 py-2 rounded-lg text-sm bg-[var(--background)] border border-[var(--border)] cursor-pointer focus:ring-2 focus:ring-[var(--primary)]/30 focus:outline-none ${
                        isOverdue ? "text-red-600 border-red-300" : ""
                      }`}
                    />
                  </div>
                  {isOverdue && (
                    <p className="flex items-center gap-1 mt-1.5 text-[11px] font-medium text-red-600">
                      <Clock className="h-3 w-3" />
                      En retard
                    </p>
                  )}
                </div>

                {/* Created */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1 block">
                    Cree le
                  </label>
                  <p className="text-sm">
                    {format(new Date(task.createdAt), "dd MMMM yyyy", { locale: fr })}
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
