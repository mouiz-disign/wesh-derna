"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import {
  Loader2,
  Search,
  Filter,
  Share2,
  Plus,
  Table2,
  Kanban,
  GanttChart,
  FileText,
  BarChart3,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
  Undo2,
  Redo2,
  MoreHorizontal,
  Globe,
  Info,
  Star,
  Zap,
} from "lucide-react";
import { ProjectInviteDialog } from "@/components/projects/project-invite-dialog";
import type { Project, WorkspaceMember, ProjectMember } from "@repo/types";

type ViewMode = "board" | "table" | "gantt";

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

  const basePath = `/w/${params.workspaceId}/projects/${params.projectId}`;
  const totalTasks = project.columns.reduce((s, c) => s + c.tasks.length, 0);
  const members = workspace?.members || [];

  return (
    <div className="flex h-full flex-col">
      {/* ═══ Top bar: Workspace > Project ═══ */}
      <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mb-1">
          <span>{workspace?.name}</span>
          <span>/</span>
          <span className="text-[var(--on-surface)] font-medium">{project.name}</span>
        </div>

        {/* Project title row */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div
              className="h-6 w-6 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: project.color }}
            >
              {project.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-base sm:text-lg font-headline font-bold truncate">{project.name}</h1>
            <button className="p-1 text-[var(--muted-foreground)] hover:text-[var(--on-surface)] transition-colors hidden sm:block">
              <Info className="h-4 w-4" />
            </button>
            <button className="p-1 text-[var(--muted-foreground)] hover:text-amber-500 transition-colors hidden sm:block">
              <Star className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-low)] rounded-lg transition-colors">
              <Zap className="h-3.5 w-3.5" />
              Automatisation
            </button>
            <button
              onClick={() => setShowInviteDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-low)] rounded-lg transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              Partager
            </button>
            {/* Members avatars */}
            <div className="flex -space-x-2 ml-2">
              {members.slice(0, 4).map((m: WorkspaceMember, i: number) => {
                const initials = m.user.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <div
                    key={m.id}
                    className="h-7 w-7 rounded-full ring-2 ring-[var(--background)] gradient-primary flex items-center justify-center text-[9px] font-bold text-white"
                    title={m.user.name}
                  >
                    {initials}
                  </div>
                );
              })}
              {members.length > 4 && (
                <div className="h-7 w-7 rounded-full ring-2 ring-[var(--background)] bg-[var(--surface-high)] flex items-center justify-center text-[9px] font-bold text-[var(--muted-foreground)]">
                  +{members.length - 4}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowInviteDialog(true)}
              className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center text-white hover:shadow-md transition-all"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Wrike-style tab bar ═══ */}
      <div className="border-b border-[var(--border)] px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          {/* Left: View tabs */}
          <div className="flex items-center gap-0.5 overflow-x-auto flex-nowrap scrollbar-none">
            <ViewTab
              icon={Table2}
              label="Tableau"
              active={viewMode === "table"}
              onClick={() => setViewMode("table")}
            />
            <ViewTab
              icon={Kanban}
              label="Tableau agile"
              active={viewMode === "board"}
              onClick={() => setViewMode("board")}
            />
            <Link href={`${basePath}/timeline`}>
              <ViewTab
                icon={GanttChart}
                label="Diagramme de Gantt"
                active={false}
                onClick={() => {}}
              />
            </Link>
            <ViewTab
              icon={FileText}
              label="Fichiers"
              active={false}
              onClick={() => {}}
            />
            <Link href={`/w/${params.workspaceId}/analytics`}>
              <ViewTab
                icon={BarChart3}
                label="Statistiques"
                active={false}
                onClick={() => {}}
              />
            </Link>

            {/* "Tout" dropdown */}
            <button className="flex items-center gap-1 px-3 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--on-surface)] transition-colors">
              Tout <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          {/* Right: Filter & actions */}
          <div className="flex items-center gap-1">
            <div className="relative group">
              <button
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filterAssigneeId
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--surface-low)]"
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                {filterAssigneeId
                  ? projectMembers.find((m) => m.userId === filterAssigneeId)?.user.name || "Filtre"
                  : "Filtre"}
              </button>
              <div className="absolute top-full right-0 mt-1 w-48 bg-[var(--surface-lowest)] rounded-xl shadow-xl border border-[var(--border)] py-1 hidden group-hover:block z-50">
                <button
                  onClick={() => setFilterAssigneeId(null)}
                  className={`w-full px-3 py-2 text-left text-xs hover:bg-[var(--surface-low)] transition-colors ${
                    !filterAssigneeId ? "font-bold text-[var(--primary)]" : ""
                  }`}
                >
                  Tous les membres
                </button>
                {projectMembers.map((m) => {
                  const initials = m.user.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <button
                      key={m.userId}
                      onClick={() => setFilterAssigneeId(m.userId)}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-[var(--surface-low)] transition-colors flex items-center gap-2 ${
                        filterAssigneeId === m.userId ? "font-bold text-[var(--primary)]" : ""
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-[8px] font-bold text-white">
                        {initials}
                      </div>
                      {m.user.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <button className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-low)] rounded-md transition-colors">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Nom
            </button>
            <div className="hidden sm:block w-px h-5 bg-[var(--border)] mx-1" />
            <button className="hidden md:block p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-low)] rounded-md transition-colors">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
            <button className="hidden md:block p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-low)] rounded-md transition-colors">
              <Globe className="h-3.5 w-3.5" />
            </button>
            <div className="hidden md:block w-px h-5 bg-[var(--border)] mx-1" />
            <button className="hidden md:block p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-low)] rounded-md transition-colors">
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button className="hidden md:block p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-low)] rounded-md transition-colors">
              <Redo2 className="h-3.5 w-3.5" />
            </button>
            <button className="p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-low)] rounded-md transition-colors">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Content area ═══ */}
      {viewMode === "board" ? (
        <div className="flex-1 overflow-x-auto">
          <KanbanBoard
            project={project}
            onTaskClick={(taskId) => setSelectedTaskId(taskId)}
            onRefresh={fetchProject}
            filterAssigneeId={filterAssigneeId}
          />
        </div>
      ) : viewMode === "table" ? (
        <TableView project={project} onTaskClick={(taskId) => setSelectedTaskId(taskId)} />
      ) : null}

      <TaskDetailSheet
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
        onUpdated={fetchProject}
      />

      <ProjectInviteDialog
        workspaceId={params.workspaceId as string}
        projectId={params.projectId as string}
        projectName={project.name}
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
      />
    </div>
  );
}

/* ── View Tab ── */
function ViewTab({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all border-b-2 ${
        active
          ? "border-[var(--primary)] text-[var(--primary)]"
          : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--on-surface)]"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

/* ── Table View (Wrike-style) ── */
function TableView({
  project,
  onTaskClick,
}: {
  project: Project;
  onTaskClick: (taskId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = (colId: string) => {
    setCollapsed((prev) => ({ ...prev, [colId]: !prev[colId] }));
  };

  const priorityLabels: Record<string, string> = {
    LOW: "Basse",
    MEDIUM: "Moyenne",
    HIGH: "Haute",
    URGENT: "Urgente",
  };
  const priorityColors: Record<string, string> = {
    LOW: "bg-slate-100 text-slate-600",
    MEDIUM: "bg-blue-50 text-blue-700",
    HIGH: "bg-orange-50 text-orange-700",
    URGENT: "bg-red-50 text-red-700",
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_140px_130px_120px_120px] gap-0 border-b bg-[var(--surface-low)] px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <input type="checkbox" className="rounded" />
          <span>Nom</span>
          <ArrowUpDown className="h-3 w-3 ml-1" />
        </div>
        <span>Charge de mission</span>
        <span>Statut</span>
        <span>Priorite</span>
        <span>Echeance</span>
      </div>

      {/* Grouped by column */}
      {project.columns.map((col) => {
        const isCollapsed = !!collapsed[col.id];
        return (
        <div key={col.id}>
          {/* Group header */}
          <div
            onClick={() => toggleGroup(col.id)}
            className="flex items-center gap-2 px-6 py-2 bg-[var(--surface-low)]/50 border-b text-xs cursor-pointer hover:bg-[var(--surface-low)] transition-colors select-none"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            )}
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: col.color || "#94a3b8" }}
            />
            <span className="font-bold">{col.name}</span>
            <span className="text-[var(--muted-foreground)]">{col.tasks.length}</span>
          </div>

          {/* Rows */}
          {!isCollapsed && col.tasks.map((task) => {
            const initials = task.assignee?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <div
                key={task.id}
                onClick={() => onTaskClick(task.id)}
                className="grid grid-cols-[1fr_140px_130px_120px_120px] gap-0 border-b px-6 py-2.5 text-sm hover:bg-[var(--surface-low)]/50 cursor-pointer transition-colors items-center"
              >
                {/* Name */}
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" onClick={(e) => e.stopPropagation()} />
                  <FileText className="h-3.5 w-3.5 text-[var(--muted-foreground)] shrink-0" />
                  <span className="font-medium truncate">{task.title}</span>
                </div>

                {/* Assignee */}
                <div className="flex items-center gap-2">
                  {task.assignee ? (
                    <>
                      <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-[9px] font-bold text-white">
                        {initials}
                      </div>
                      <span className="text-xs text-[var(--muted-foreground)] truncate">
                        {task.assignee.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-[var(--muted-foreground)]/50">—</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--surface-high)]">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: col.color || "#94a3b8" }}
                    />
                    {col.name}
                  </span>
                </div>

                {/* Priority */}
                <div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${priorityColors[task.priority] || ""}`}>
                    {priorityLabels[task.priority] || task.priority}
                  </span>
                </div>

                {/* Deadline */}
                <span className="text-xs text-[var(--muted-foreground)]">
                  {task.deadline
                    ? new Date(task.deadline).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
                    : "—"}
                </span>
              </div>
            );
          })}
        </div>
        );
      })}

      {/* Add task row */}
      <div className="px-6 py-3 flex items-center gap-2 text-xs text-[var(--muted-foreground)] border-b cursor-pointer hover:bg-[var(--surface-low)]/50">
        <Plus className="h-3.5 w-3.5" />
        Ajouter une tache...
      </div>
    </div>
  );
}
