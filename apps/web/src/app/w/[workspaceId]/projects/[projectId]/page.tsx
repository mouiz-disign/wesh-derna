"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import {
  Loader2,
  Filter,
  Share2,
  Plus,
  Table2,
  Kanban,
  GanttChart,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Mic,
  Square,
  Link2,
  Trash2,
} from "lucide-react";
import { VoiceNotesDrawer } from "@/components/projects/voice-notes-drawer";
import { VoicePlayer } from "@/components/tasks/voice-recorder";
import { toast } from "sonner";
import {
  addDays,
  startOfWeek,
  eachDayOfInterval,
  format,
  differenceInDays,
  isToday,
  addWeeks,
  subWeeks,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ProjectInviteDialog } from "@/components/projects/project-invite-dialog";
import type { Project, Task, Column, WorkspaceMember, ProjectMember } from "@repo/types";

type ViewMode = "board" | "table" | "gantt" | "vocal";

const priorityLabels: Record<string, string> = { LOW: "Basse", MEDIUM: "Moyenne", HIGH: "Haute", URGENT: "Urgente" };
const priorityBadge: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  MEDIUM: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  HIGH: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  URGENT: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};
const priorityBar: Record<string, string> = { LOW: "#94a3b8", MEDIUM: "#3b82f6", HIGH: "#f59e0b", URGENT: "#ef4444" };

export default function ProjectPage() {
  const params = useParams();
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [filterAssigneeId, setFilterAssigneeId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showVoiceDrawer, setShowVoiceDrawer] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [voiceNoteCount, setVoiceNoteCount] = useState(0);

  const fetchProject = async () => {
    try {
      const { data } = await api.get(`/projects/${params.projectId}`);
      setProject(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data } = await api.get(`/projects/${params.projectId}/members`);
      setProjectMembers(data);
    } catch {}
  };

  useEffect(() => {
    fetchProject();
    fetchMembers();
    api.get(`/projects/${params.projectId}/voice-notes`)
      .then(({ data }) => setVoiceNoteCount(data.filter((n: any) => !n.taskId).length))
      .catch(() => {});
  }, [params.projectId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm",
      });
      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        // Upload
        const formData = new FormData();
        formData.append("file", blob, "voice-note.webm");
        formData.append("duration", String(recordElapsed));
        try {
          await api.post(`/projects/${params.projectId}/voice-notes`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          toast.success("Note vocale envoyee");
          setVoiceNoteCount((c) => c + 1);
        } catch { toast.error("Erreur upload"); }
      };
      mediaRecorder.start(100);
      setRecording(true);
      setRecordElapsed(0);
      timerRef.current = setInterval(() => setRecordElapsed((p) => p + 1), 1000);
    } catch {}
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  if (loading || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  const totalTasks = project.columns.reduce((s, c) => s + c.tasks.length, 0);
  const members = workspace?.members || [];

  return (
    <div className="flex h-full flex-col">
      {/* ═══ Header ═══ */}
      <div className="px-4 sm:px-6 pt-4 pb-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] mb-2">
          <span>{workspace?.name}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[var(--on-surface)] font-medium">{project.name}</span>
        </div>

        {/* Title row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: project.color }}
            >
              {project.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-lg font-headline font-bold truncate">{project.name}</h1>
            <span className="text-xs text-[var(--muted-foreground)] hidden sm:block">
              {totalTasks} tache{totalTasks !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInviteDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-low)] rounded-lg transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Partager</span>
            </button>
            {/* Members */}
            <div className="flex -space-x-1.5">
              {members.slice(0, 3).map((m: WorkspaceMember) => {
                const init = m.user.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <div key={m.id} className="h-7 w-7 rounded-full ring-2 ring-[var(--background)] gradient-primary flex items-center justify-center text-[9px] font-bold text-white" title={m.user.name}>
                    {init}
                  </div>
                );
              })}
              {members.length > 3 && (
                <div className="h-7 w-7 rounded-full ring-2 ring-[var(--background)] bg-[var(--surface-high)] flex items-center justify-center text-[9px] font-bold text-[var(--muted-foreground)]">
                  +{members.length - 3}
                </div>
              )}
            </div>
            <button onClick={() => setShowInviteDialog(true)} className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center text-white hover:shadow-md transition-all">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Tabs + Actions bar ═══ */}
      <div className="px-4 sm:px-6 flex items-center justify-between gap-4 border-b border-[var(--border)]">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none -mb-px">
          <TabBtn icon={Kanban} label="Kanban" active={viewMode === "board"} onClick={() => setViewMode("board")} />
          <TabBtn icon={Table2} label="Tableau" active={viewMode === "table"} onClick={() => setViewMode("table")} />
          <TabBtn icon={GanttChart} label="Gantt" active={viewMode === "gantt"} onClick={() => setViewMode("gantt")} />
          <TabBtn icon={Mic} label="Vocal" active={viewMode === "vocal"} onClick={() => setViewMode("vocal")} badge={voiceNoteCount} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Filter */}
          <div className="relative group">
            <button className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${filterAssigneeId ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:bg-[var(--surface-low)]"}`}>
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{filterAssigneeId ? projectMembers.find((m) => m.userId === filterAssigneeId)?.user.name || "Filtre" : "Filtre"}</span>
            </button>
            <div className="absolute top-full right-0 mt-1 w-48 bg-[var(--surface-lowest)] rounded-xl shadow-xl border border-[var(--border)] py-1 hidden group-hover:block z-50">
              <button onClick={() => setFilterAssigneeId(null)} className={`w-full px-3 py-2 text-left text-xs hover:bg-[var(--surface-low)] transition-colors ${!filterAssigneeId ? "font-bold text-[var(--primary)]" : ""}`}>
                Tous
              </button>
              {projectMembers.map((m) => (
                <button key={m.userId} onClick={() => setFilterAssigneeId(m.userId)} className={`w-full px-3 py-2 text-left text-xs hover:bg-[var(--surface-low)] transition-colors flex items-center gap-2 ${filterAssigneeId === m.userId ? "font-bold text-[var(--primary)]" : ""}`}>
                  <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-[8px] font-bold text-white">
                    {m.user.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  {m.user.name}
                </button>
              ))}
            </div>
          </div>

          {/* Gantt navigation */}
          {viewMode === "gantt" && (
            <div className="flex items-center gap-1 ml-1">
              <button onClick={() => setWeekOffset((w) => w - 1)} className="p-1.5 rounded-lg hover:bg-[var(--surface-low)] text-[var(--muted-foreground)] transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setWeekOffset(0)} className="px-2 py-1 text-[11px] font-semibold rounded-lg hover:bg-[var(--surface-low)] text-[var(--muted-foreground)] transition-colors">
                Aujourd&apos;hui
              </button>
              <button onClick={() => setWeekOffset((w) => w + 1)} className="p-1.5 rounded-lg hover:bg-[var(--surface-low)] text-[var(--muted-foreground)] transition-colors">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Content ═══ */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "board" && (
          <div className="h-full overflow-x-auto">
            <KanbanBoard project={project} onTaskClick={(id) => setSelectedTaskId(id)} onRefresh={fetchProject} filterAssigneeId={filterAssigneeId} members={members.map((m: any) => m.user || m)} />
          </div>
        )}
        {viewMode === "table" && <TableView project={project} onTaskClick={(id) => setSelectedTaskId(id)} />}
        {viewMode === "gantt" && <GanttView project={project} weekOffset={weekOffset} onTaskClick={(id) => setSelectedTaskId(id)} />}
        {viewMode === "vocal" && <VocalView projectId={params.projectId as string} columns={project.columns} onRefresh={fetchProject} onNoteCountChange={setVoiceNoteCount} />}
      </div>

      <TaskDetailSheet taskId={selectedTaskId} open={!!selectedTaskId} onOpenChange={(open) => !open && setSelectedTaskId(null)} onUpdated={fetchProject} />
      <ProjectInviteDialog workspaceId={params.workspaceId as string} projectId={params.projectId as string} projectName={project.name} open={showInviteDialog} onClose={() => setShowInviteDialog(false)} />

      {/* Floating mic button */}
      <div className="fixed bottom-8 right-6 z-40 flex flex-col items-center gap-3">
        {recording && (
          <div className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-bold animate-pulse shadow-lg">
            {Math.floor(recordElapsed / 60)}:{String(recordElapsed % 60).padStart(2, "0")}
          </div>
        )}
        <div className="relative">
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`h-20 w-20 rounded-full flex items-center justify-center shadow-2xl transition-all ${
              recording
                ? "bg-red-500 hover:bg-red-600 animate-pulse ring-4 ring-red-300/50"
                : "gradient-primary hover:shadow-xl hover:scale-110 ring-4 ring-[var(--primary)]/20"
            }`}
          >
            {recording ? <Square className="h-7 w-7 text-white fill-white" /> : <Mic className="h-8 w-8 text-white" />}
          </button>
          {!recording && voiceNoteCount > 0 && (
            <button
              onClick={() => setShowVoiceDrawer(true)}
              className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white shadow-md"
            >
              {voiceNoteCount}
            </button>
          )}
        </div>
        {!recording && (
          <button
            onClick={() => setShowVoiceDrawer(true)}
            className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
          >
            Voir les notes
          </button>
        )}
      </div>

      <VoiceNotesDrawer
        projectId={params.projectId as string}
        columns={project.columns}
        open={showVoiceDrawer}
        onClose={() => setShowVoiceDrawer(false)}
        onRefresh={() => { fetchProject(); api.get(`/projects/${params.projectId}/voice-notes`).then(({ data }) => setVoiceNoteCount(data.filter((n: any) => !n.taskId).length)).catch(() => {}); }}
      />
    </div>
  );
}

/* ── Tab Button ── */
function TabBtn({ icon: Icon, label, active, onClick, badge }: { icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${active ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--on-surface)]"}`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{badge}</span>
      )}
    </button>
  );
}

/* ── Table View ── */
function TableView({ project, onTaskClick }: { project: Project; onTaskClick: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [togglingSubtask, setTogglingSubtask] = useState<string | null>(null);

  const toggleTaskExpand = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks((p) => ({ ...p, [taskId]: !p[taskId] }));
  };

  const handleToggleSubtask = async (subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingSubtask(subtaskId);
    try {
      await api.patch(`/tasks/subtasks/${subtaskId}/toggle`);
    } catch {}
    setTogglingSubtask(null);
  };

  return (
    <div className="h-full overflow-auto">
      <div className="grid grid-cols-[1fr_130px_120px_100px_100px] gap-0 border-b bg-[var(--surface-low)] px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] sticky top-0 z-10">
        <span>Tache</span>
        <span>Assignee</span>
        <span>Statut</span>
        <span>Priorite</span>
        <span>Echeance</span>
      </div>

      {project.columns.map((col) => {
        const isCollapsed = !!collapsed[col.id];
        return (
          <div key={col.id}>
            <button
              onClick={() => setCollapsed((p) => ({ ...p, [col.id]: !p[col.id] }))}
              className="w-full flex items-center gap-2 px-6 py-2 bg-[var(--surface-low)]/50 border-b text-xs hover:bg-[var(--surface-low)] transition-colors"
            >
              {isCollapsed ? <ChevronRight className="h-3 w-3 text-[var(--muted-foreground)]" /> : <ChevronDown className="h-3 w-3 text-[var(--muted-foreground)]" />}
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color || "#94a3b8" }} />
              <span className="font-bold">{col.name}</span>
              <span className="text-[var(--muted-foreground)] ml-1">{col.tasks.length}</span>
            </button>

            {!isCollapsed && col.tasks.map((task) => {
              const init = task.assignee?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
              const hasSubtasks = (task.subtasks?.length ?? 0) > 0;
              const isExpanded = !!expandedTasks[task.id];
              const doneSubs = task.subtasks?.filter((s) => s.done).length ?? 0;
              const totalSubs = task.subtasks?.length ?? 0;

              return (
                <div key={task.id}>
                  {/* Task row */}
                  <div onClick={() => onTaskClick(task.id)} className="grid grid-cols-[1fr_130px_120px_100px_100px] gap-0 border-b px-6 py-2.5 text-sm hover:bg-[var(--surface-low)]/50 cursor-pointer transition-colors items-center">
                    <div className="flex items-center gap-1.5">
                      {hasSubtasks ? (
                        <button onClick={(e) => toggleTaskExpand(task.id, e)} className="p-0.5 rounded hover:bg-[var(--surface-high)] text-[var(--muted-foreground)] shrink-0">
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>
                      ) : <span className="w-4" />}
                      <span className="font-medium truncate">{task.title}</span>
                      {hasSubtasks && (
                        <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">{doneSubs}/{totalSubs}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {task.assignee ? (
                        <>
                          <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-[8px] font-bold text-white">{init}</div>
                          <span className="text-xs text-[var(--muted-foreground)] truncate">{task.assignee.name}</span>
                        </>
                      ) : <span className="text-xs text-[var(--muted-foreground)]">—</span>}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color || "#94a3b8" }} />
                      {col.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit ${priorityBadge[task.priority] || ""}`}>
                      {priorityLabels[task.priority] || task.priority}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {task.deadline ? new Date(task.deadline).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—"}
                    </span>
                  </div>

                  {/* Subtask rows (expanded) */}
                  {isExpanded && task.subtasks?.map((st) => (
                    <div
                      key={st.id}
                      className="grid grid-cols-[1fr_130px_120px_100px_100px] gap-0 border-b pl-14 pr-6 py-2 text-sm bg-[var(--surface-low)]/30 hover:bg-[var(--surface-low)]/60 transition-colors items-center"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleToggleSubtask(st.id, e)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                            st.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-[var(--muted-foreground)]/40 hover:border-[var(--primary)]"
                          } ${togglingSubtask === st.id ? "opacity-50" : ""}`}
                        >
                          {st.done && (
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span className={`text-xs ${st.done ? "line-through text-[var(--muted-foreground)]" : ""}`}>
                          {st.title}
                        </span>
                        {(st.weight ?? 0) > 0 && (
                          <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${st.done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-[var(--surface-high)] text-[var(--muted-foreground)]"}`}>
                            {st.weight}%
                          </span>
                        )}
                      </div>
                      <span />
                      <span className="text-[10px] text-[var(--muted-foreground)]">{st.done ? "Fait" : "A faire"}</span>
                      <span />
                      <span />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ── Gantt View (inline, no page redirect) ── */
function GanttView({ project, weekOffset, onTaskClick }: { project: Project; weekOffset: number; onTaskClick: (id: string) => void }) {
  const allTasks = project.columns.flatMap((col) =>
    col.tasks.map((t) => ({ ...t, columnName: col.name, columnColor: col.color })),
  );
  const timelineTasks = allTasks.filter((t) => t.deadline);

  const baseDate = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset);
  const days = eachDayOfInterval({ start: baseDate, end: addDays(baseDate, 27) });
  const startDate = days[0]!;
  const totalDays = days.length;

  if (timelineTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[var(--muted-foreground)]">
        Aucune tache avec deadline. Ajoutez des dates pour voir le Gantt.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="min-w-[800px]">
        {/* Day headers */}
        <div className="flex border-b sticky top-0 bg-[var(--background)] z-10">
          <div className="w-48 shrink-0 border-r px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
            Tache
          </div>
          <div className="flex flex-1">
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={`flex-1 border-r px-0.5 py-1.5 text-center text-[9px] ${
                  isToday(day) ? "bg-[var(--primary)]/10 font-bold text-[var(--primary)]" :
                  day.getDay() === 0 || day.getDay() === 6 ? "bg-[var(--surface-low)]/50 text-[var(--muted-foreground)]" : "text-[var(--muted-foreground)]"
                }`}
              >
                <div className="font-medium">{format(day, "EEE", { locale: fr })}</div>
                <div>{format(day, "dd")}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Task rows */}
        {timelineTasks.map((task) => {
          const deadline = new Date(task.deadline!);
          const taskStart = addDays(deadline, -2);
          const offsetStart = Math.max(differenceInDays(taskStart, startDate), 0);
          const offsetEnd = Math.min(differenceInDays(deadline, startDate), totalDays - 1);
          const barWidth = Math.max(offsetEnd - offsetStart + 1, 1);
          const isVisible = offsetEnd >= 0 && offsetStart < totalDays;
          const init = task.assignee?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

          return (
            <div key={task.id} onClick={() => onTaskClick(task.id)} className="flex border-b hover:bg-[var(--surface-low)]/30 transition-colors cursor-pointer">
              <div className="w-48 shrink-0 border-r px-4 py-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: task.columnColor || "#94a3b8" }} />
                <span className="text-xs truncate">{task.title}</span>
              </div>
              <div className="flex flex-1 relative" style={{ minHeight: 34 }}>
                {days.some((d) => isToday(d)) && (
                  <div className="absolute top-0 bottom-0 w-px bg-[var(--primary)] z-10" style={{ left: `${(differenceInDays(new Date(), startDate) / totalDays) * 100}%` }} />
                )}
                {isVisible && (
                  <div
                    className="absolute top-1 h-6 rounded-md flex items-center gap-1 px-2 text-[10px] font-medium text-white shadow-sm"
                    style={{ left: `${(offsetStart / totalDays) * 100}%`, width: `${(barWidth / totalDays) * 100}%`, backgroundColor: priorityBar[task.priority] || "#6366f1", minWidth: 50 }}
                  >
                    {init && <span className="bg-white/20 rounded-sm px-0.5 text-[9px]">{init}</span>}
                    <span className="truncate">{task.title}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Vocal View (inline tab) ── */
function VocalView({ projectId, columns, onRefresh, onNoteCountChange }: { projectId: string; columns: Column[]; onRefresh: () => void; onNoteCountChange: (n: number) => void }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "free" | "linked">("all");
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertForm, setConvertForm] = useState({ title: "", columnId: "", priority: "MEDIUM" });
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const fetchNotes = async () => {
    try {
      const { data } = await api.get(`/projects/${projectId}/voice-notes`);
      setNotes(data);
      onNoteCountChange(data.filter((n: any) => !n.taskId).length);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchNotes(); }, [projectId]);

  const allTasks = columns.flatMap((c) => c.tasks);
  const filtered = notes.filter((n) => {
    if (filter === "free") return !n.taskId;
    if (filter === "linked") return !!n.taskId;
    return true;
  });

  const handleConvert = async (noteId: string) => {
    if (!convertForm.title.trim() || !convertForm.columnId) return;
    try {
      await api.post(`/voice-notes/${noteId}/convert`, convertForm);
      toast.success("Tache creee");
      setConvertingId(null);
      fetchNotes();
      onRefresh();
    } catch { toast.error("Erreur"); }
  };

  const handleLink = async (noteId: string, taskId: string) => {
    try {
      await api.patch(`/voice-notes/${noteId}/link`, { taskId });
      toast.success("Note rattachee");
      setLinkingId(null);
      fetchNotes();
    } catch { toast.error("Erreur"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/voice-notes/${id}`);
      setNotes((p) => p.filter((n) => n.id !== id));
      toast.success("Supprimee");
    } catch { toast.error("Erreur"); }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" /></div>;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Mic className="h-5 w-5 text-[var(--primary)]" />
          Notes vocales
          <span className="text-sm font-normal text-[var(--muted-foreground)]">{notes.length}</span>
        </h2>
        <div className="flex gap-1.5">
          {(["all", "free", "linked"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filter === f ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-low)] text-[var(--muted-foreground)]"}`}>
              {f === "all" ? "Toutes" : f === "free" ? "Non traitees" : "Traitees"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted-foreground)]">
          <Mic className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{filter === "free" ? "Aucune note en attente" : "Aucune note vocale"}</p>
          <p className="text-xs mt-1">Appuyez sur le bouton micro pour enregistrer</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((note: any) => {
            const initials = note.author?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <div key={note.id} className={`rounded-xl border p-4 transition-all ${note.taskId ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10" : "border-[var(--border)] bg-[var(--surface-lowest)]"}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-white">{initials}</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{note.author?.name}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      {new Date(note.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(note.id)} className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Audio player - reuse VoicePlayer */}
                <div className="mb-3">
                  <VoicePlayer src={`${API_URL}${note.url}`} />
                </div>

                {note.task ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg">
                    <Link2 className="h-3.5 w-3.5" />
                    Liee a : <span className="font-semibold">{note.task.title}</span>
                  </div>
                ) : convertingId === note.id ? (
                  <div className="space-y-2 p-3 bg-[var(--surface-low)] rounded-lg">
                    <input autoFocus value={convertForm.title} onChange={(e) => setConvertForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Titre de la tache..." className="w-full h-9 px-3 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)] outline-none focus:ring-1 focus:ring-[var(--primary)]/30" />
                    <div className="flex gap-2">
                      <select value={convertForm.columnId} onChange={(e) => setConvertForm((p) => ({ ...p, columnId: e.target.value }))}
                        className="flex-1 h-9 px-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)]">
                        <option value="">Colonne...</option>
                        {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <select value={convertForm.priority} onChange={(e) => setConvertForm((p) => ({ ...p, priority: e.target.value }))}
                        className="h-9 px-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)]">
                        <option value="LOW">Basse</option>
                        <option value="MEDIUM">Moyenne</option>
                        <option value="HIGH">Haute</option>
                        <option value="URGENT">Urgente</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleConvert(note.id)} disabled={!convertForm.title.trim() || !convertForm.columnId}
                        className="flex-1 h-9 gradient-primary text-white rounded-lg text-sm font-bold disabled:opacity-40">Creer la tache</button>
                      <button onClick={() => setConvertingId(null)} className="h-9 px-4 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)]">Annuler</button>
                    </div>
                  </div>
                ) : linkingId === note.id ? (
                  <div className="p-2 bg-[var(--surface-low)] rounded-lg max-h-40 overflow-y-auto space-y-0.5">
                    {allTasks.map((t) => (
                      <button key={t.id} onClick={() => handleLink(note.id, t.id)} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[var(--surface-high)] truncate transition-colors">{t.title}</button>
                    ))}
                    <button onClick={() => setLinkingId(null)} className="w-full text-center text-xs text-[var(--muted-foreground)] py-2">Annuler</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setConvertingId(note.id); setConvertForm({ title: "", columnId: columns[0]?.id || "", priority: "MEDIUM" }); }}
                      className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm font-semibold gradient-primary text-white">
                      <Plus className="h-4 w-4" /> Creer une tache
                    </button>
                    <button onClick={() => setLinkingId(note.id)}
                      className="flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium bg-[var(--surface-low)] hover:bg-[var(--surface-high)] transition-colors">
                      <Link2 className="h-3.5 w-3.5" /> Rattacher
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
