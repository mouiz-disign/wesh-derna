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
  Mic,
  GripVertical,
  Pencil,
  Eye,
  Check,
  CheckCheck,
  Save,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Task, Comment, UserPreview, Attachment } from "@repo/types";
import { VoiceRecorder, VoicePlayer } from "@/components/tasks/voice-recorder";
import { AttachmentList } from "@/components/tasks/attachment-list";

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
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; done: boolean; weight: number; order: number; assigneeId?: string | null }[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [taskNotifs, setTaskNotifs] = useState<{ user: { id: string; name: string }; read: boolean; readAt: string | null; title: string }[]>([]);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingWeight, setEditingWeight] = useState(0);
  const [editingAssigneeId, setEditingAssigneeId] = useState<string | null>(null);
  const [dragSubtaskId, setDragSubtaskId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

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
        setAttachments(taskRes.data.attachments || []);
        // Fetch notification read report for this task's project
        if (taskRes.data.projectId) {
          api.get(`/notifications/task-report/${taskRes.data.projectId}`)
            .then(({ data: notifs }) => {
              const taskTitle = taskRes.data.title;
              const relevant = notifs.filter((n: any) => n.message?.includes(taskTitle));
              setTaskNotifs(relevant);
            })
            .catch(() => {});
        }
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

  const handleSaveAndClose = async () => {
    if (!taskId || !task) return;
    const payload: Record<string, string | null> = {};
    if (title.trim() && title !== task.title) payload.title = title.trim();
    if (description !== (task.description || "")) payload.description = description;
    try {
      if (Object.keys(payload).length > 0) {
        await api.put(`/tasks/${taskId}`, payload);
        onUpdated();
      }
      toast.success("Modifications enregistrees");
      onOpenChange(false);
    } catch {
      toast.error("Erreur enregistrement");
    }
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

  const handleUpdateSubtask = async (subtaskId: string) => {
    if (!editingTitle.trim()) return;
    try {
      const { data } = await api.patch(`/tasks/subtasks/${subtaskId}`, {
        title: editingTitle.trim(),
        weight: editingWeight,
        assigneeId: editingAssigneeId || null,
      });
      setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? data : s)));
      setEditingSubtaskId(null);
    } catch { toast.error("Erreur"); }
  };

  const handleDragReorder = async (fromIndex: number, toIndex: number) => {
    const reordered = [...subtasks];
    const [moved] = reordered.splice(fromIndex, 1);
    if (!moved) return;
    reordered.splice(toIndex, 0, moved);
    setSubtasks(reordered);
    try {
      await api.patch(`/tasks/${taskId}/subtasks/reorder`, {
        subtaskIds: reordered.map((s) => s.id),
      });
    } catch { toast.error("Erreur reorder"); }
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
  const hasWeights = subtasks.some((s) => s.weight > 0);
  const totalWeight = hasWeights ? subtasks.reduce((sum, s) => sum + (s.weight || 0), 0) : 0;
  const doneWeight = hasWeights ? subtasks.filter((s) => s.done).reduce((sum, s) => sum + (s.weight || 0), 0) : 0;
  const subtaskProgress = hasWeights && totalWeight > 0
    ? Math.round((doneWeight / totalWeight) * 100)
    : subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  const currentPriority = priorityOptions.find((p) => p.value === task?.priority) || priorityOptions[1]!;
  const assignee = task?.assignee;
  const initials = assignee?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const isOverdue = task?.deadline && new Date(task.deadline) < new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-3xl lg:max-w-4xl p-0 overflow-hidden gap-0 border-0 shadow-2xl rounded-2xl max-h-[92vh] sm:max-h-[88vh]">
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

            <div className="flex flex-col md:flex-row">
              {/* Left — Main content */}
              <div className="flex-1 min-w-0 p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[55vh] md:max-h-[80vh]">
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
                  className="w-full resize-none rounded-xl bg-[var(--surface-low)] px-4 py-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 border-none placeholder:text-[var(--muted-foreground)] leading-relaxed"
                />

                {/* Voice note */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-3 flex items-center gap-2">
                    <Mic className="h-3.5 w-3.5" />
                    Message vocal
                  </h4>
                  {task.voiceNoteUrl ? (
                    <VoicePlayer
                      src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}${task.voiceNoteUrl}`}
                      onRemove={async () => {
                        try {
                          await api.delete(`/tasks/${taskId}/voice-note`);
                          setTask((prev) => prev ? { ...prev, voiceNoteUrl: null } : null);
                          onUpdated();
                          toast.success("Vocal supprime");
                        } catch { toast.error("Erreur"); }
                      }}
                    />
                  ) : (
                    <VoiceRecorder
                      onRecorded={async (blob) => {
                        try {
                          const formData = new FormData();
                          formData.append("file", blob, "voice-note.webm");
                          const { data } = await api.post(`/tasks/${taskId}/voice-note`, formData, {
                            headers: { "Content-Type": "multipart/form-data" },
                          });
                          setTask((prev) => prev ? { ...prev, voiceNoteUrl: data.voiceNoteUrl } : null);
                          onUpdated();
                          toast.success("Vocal enregistre");
                        } catch { toast.error("Erreur upload"); }
                      }}
                    />
                  )}
                </div>

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

                  <div className="space-y-0.5">
                    {subtasks.map((st, idx) => (
                      <div
                        key={st.id}
                        draggable
                        onDragStart={() => setDragSubtaskId(st.id)}
                        onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={() => {
                          if (dragSubtaskId && dragSubtaskId !== st.id) {
                            const fromIdx = subtasks.findIndex((s) => s.id === dragSubtaskId);
                            handleDragReorder(fromIdx, idx);
                          }
                          setDragSubtaskId(null);
                        }}
                        onDragEnd={() => setDragSubtaskId(null)}
                        className={`flex items-center gap-2 group py-1.5 px-2 rounded-lg hover:bg-[var(--surface-low)] transition-colors ${
                          dragSubtaskId === st.id ? "opacity-40" : ""
                        }`}
                      >
                        {/* Drag handle */}
                        <GripVertical className="h-3.5 w-3.5 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-50 cursor-grab shrink-0" />

                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleSubtask(st.id)}
                          className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                            st.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-[var(--muted-foreground)]/40 hover:border-[var(--primary)]"
                          }`}
                        >
                          {st.done && (
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        {editingSubtaskId === st.id ? (
                          /* Edit mode */
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              autoFocus
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdateSubtask(st.id);
                                if (e.key === "Escape") setEditingSubtaskId(null);
                              }}
                              className="flex-1 h-7 px-2 text-sm rounded bg-[var(--surface-low)] border-none outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
                            />
                            <select
                              value={editingAssigneeId || ""}
                              onChange={(e) => setEditingAssigneeId(e.target.value || null)}
                              className="h-7 px-1 text-[10px] rounded bg-[var(--surface-low)] border-none outline-none cursor-pointer"
                            >
                              <option value="">—</option>
                              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={editingWeight}
                                onChange={(e) => setEditingWeight(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                className="w-12 h-7 px-1.5 text-xs text-center rounded bg-[var(--surface-low)] border-none outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
                              />
                              <span className="text-[10px] text-[var(--muted-foreground)]">%</span>
                            </div>
                            <button onClick={() => handleUpdateSubtask(st.id)} className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button onClick={() => setEditingSubtaskId(null)} className="p-1 text-[var(--muted-foreground)] hover:bg-[var(--surface-high)] rounded">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          /* View mode */
                          <>
                            <span className={`flex-1 text-sm ${st.done ? "line-through text-[var(--muted-foreground)]" : ""}`}>
                              {st.title}
                            </span>
                            {st.weight > 0 && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${st.done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-[var(--surface-high)] text-[var(--muted-foreground)]"}`}>
                                {st.weight}%
                              </span>
                            )}
                            {st.assigneeId && (() => {
                              const stMember = members.find((m) => m.id === st.assigneeId);
                              const stInit = stMember?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                              return stMember ? (
                                <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-[7px] font-bold text-white shrink-0" title={stMember.name}>
                                  {stInit}
                                </div>
                              ) : null;
                            })()}
                            <button
                              onClick={() => { setEditingSubtaskId(st.id); setEditingTitle(st.title); setEditingWeight(st.weight || 0); setEditingAssigneeId(st.assigneeId || null); }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-all"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteSubtask(st.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--muted-foreground)] hover:text-red-500 transition-all"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

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

                {/* Attachments */}
                <AttachmentList
                  taskId={taskId!}
                  attachments={attachments}
                  onChanged={async () => {
                    const { data } = await api.get(`/tasks/${taskId}`);
                    setAttachments(data.attachments || []);
                    onUpdated();
                  }}
                />

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
                          <div className="flex-1 min-w-0 bg-[var(--surface-low)] rounded-xl px-3 py-2">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-xs font-bold">{c.author.name}</span>
                              <span className="text-[10px] text-[var(--muted-foreground)]">
                                {format(new Date(c.createdAt), "dd MMM HH:mm", { locale: fr })}
                              </span>
                            </div>
                            <p className="text-sm mt-0.5 break-words">{c.content}</p>
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
                      className="h-9 w-9 flex items-center justify-center gradient-primary text-white rounded-xl disabled:opacity-40 transition-all hover:shadow-md shrink-0"
                    >
                      {sendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right — Sidebar */}
              <div className="w-full md:w-64 shrink-0 border-t md:border-t-0 md:border-l border-[var(--border)] bg-[var(--surface-low)] p-5 space-y-5 overflow-y-auto max-h-[35vh] md:max-h-[80vh]">
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
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-all whitespace-nowrap ${
                          task.priority === p.value
                            ? p.bg + " ring-2 ring-offset-1 ring-current"
                            : "bg-[var(--background)] text-[var(--muted-foreground)] hover:bg-[var(--surface-high)]"
                        }`}
                      >
                        <div className={`h-2 w-2 rounded-full shrink-0 ${p.dot}`} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assignees (multi) */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2 block">
                    Assignes
                  </label>
                  {/* Current assignees */}
                  {(task.assignees || (task.assignee ? [task.assignee] : [])).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(task.assignees || (task.assignee ? [task.assignee] : [])).map((a: any) => {
                        const ai = a.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                        return (
                          <div key={a.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--background)] text-xs">
                            <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-[8px] font-bold text-white">{ai}</div>
                            <span className="font-medium">{a.name}</span>
                            <button
                              onClick={async () => {
                                const currentIds: string[] = (task.assigneeIds as string[]) || [];
                                const newIds = currentIds.filter((id: string) => id !== a.id);
                                try {
                                  const { data } = await api.put(`/tasks/${taskId}`, { assigneeIds: newIds, assigneeId: newIds[0] || null });
                                  setTask((prev) => prev ? { ...prev, ...data, assignees: undefined } : null);
                                  // Refetch to get resolved assignees
                                  const { data: fresh } = await api.get(`/tasks/${taskId}`);
                                  setTask((prev) => prev ? { ...prev, ...fresh } : null);
                                  onUpdated();
                                } catch { toast.error("Erreur"); }
                              }}
                              className="text-[var(--muted-foreground)] hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Add member dropdown */}
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {members.filter((m) => !((task.assigneeIds as string[]) || []).includes(m.id)).map((m) => {
                      const mi = m.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                      return (
                        <button
                          key={m.id}
                          onClick={async () => {
                            const currentIds: string[] = (task.assigneeIds as string[]) || [];
                            const newIds = [...currentIds, m.id];
                            try {
                              const { data } = await api.put(`/tasks/${taskId}`, { assigneeIds: newIds, assigneeId: newIds[0] });
                              setTask((prev) => prev ? { ...prev, ...data, assignees: undefined } : null);
                              const { data: fresh } = await api.get(`/tasks/${taskId}`);
                              setTask((prev) => prev ? { ...prev, ...fresh } : null);
                              onUpdated();
                            } catch { toast.error("Erreur"); }
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-[var(--surface-high)] transition-colors"
                        >
                          <div className="w-5 h-5 rounded-full bg-[var(--surface-high)] flex items-center justify-center text-[8px] font-bold text-[var(--muted-foreground)]">{mi}</div>
                          <span>{m.name}</span>
                          <Plus className="h-3 w-3 ml-auto text-[var(--muted-foreground)]" />
                        </button>
                      );
                    })}
                  </div>
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

                {/* Read report (Vu par) */}
                {taskNotifs.length > 0 && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2 block flex items-center gap-1.5">
                      <Eye className="h-3 w-3" />
                      Rapport de lecture
                    </label>
                    <div className="space-y-1.5">
                      {taskNotifs.map((n, i) => {
                        const init = n.user.name?.split(" ").map((c: string) => c[0]).join("").toUpperCase().slice(0, 2);
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                              {init}
                            </div>
                            <span className="flex-1 truncate">{n.user.name}</span>
                            {n.read ? (
                              <span className="flex items-center gap-0.5 text-blue-500" title={n.readAt ? `Lu le ${format(new Date(n.readAt), "dd MMM HH:mm", { locale: fr })}` : "Lu"}>
                                <CheckCheck className="h-3 w-3" />
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-[var(--muted-foreground)]" title="Non lu">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Save */}
                <button
                  onClick={handleSaveAndClose}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white gradient-primary hover:shadow-md transition-all"
                >
                  <Save className="h-3.5 w-3.5" />
                  Valider
                </button>

                {/* Delete */}
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
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
