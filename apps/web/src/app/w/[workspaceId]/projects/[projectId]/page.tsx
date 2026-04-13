"use client";

import { useEffect, useState } from "react";
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
  BarChart3,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
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
import type { Project, Task, WorkspaceMember, ProjectMember } from "@repo/types";

type ViewMode = "board" | "table" | "gantt";

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
  }, [params.projectId]);

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
      </div>

      <TaskDetailSheet taskId={selectedTaskId} open={!!selectedTaskId} onOpenChange={(open) => !open && setSelectedTaskId(null)} onUpdated={fetchProject} />
      <ProjectInviteDialog workspaceId={params.workspaceId as string} projectId={params.projectId as string} projectName={project.name} open={showInviteDialog} onClose={() => setShowInviteDialog(false)} />
    </div>
  );
}

/* ── Tab Button ── */
function TabBtn({ icon: Icon, label, active, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${active ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--on-surface)]"}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

/* ── Table View ── */
function TableView({ project, onTaskClick }: { project: Project; onTaskClick: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
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
              return (
                <div key={task.id} onClick={() => onTaskClick(task.id)} className="grid grid-cols-[1fr_130px_120px_100px_100px] gap-0 border-b px-6 py-2.5 text-sm hover:bg-[var(--surface-low)]/50 cursor-pointer transition-colors items-center">
                  <span className="font-medium truncate">{task.title}</span>
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
