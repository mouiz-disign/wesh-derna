"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import {
  ClipboardList,
  Loader2,
  Calendar,
  CheckSquare,
  Mic,
  Paperclip,
  MessageSquare,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Task } from "@repo/types";

type MyTask = Task & {
  column: { id: string; name: string; color: string };
  project: { id: string; name: string; color: string; workspaceId: string };
};

const priorityConfig: Record<string, { label: string; bg: string; text: string }> = {
  LOW: { label: "Basse", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400" },
  MEDIUM: { label: "Moyenne", bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  HIGH: { label: "Haute", bg: "bg-orange-50 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300" },
  URGENT: { label: "Urgente", bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" },
};

const statusColors: Record<string, string> = {
  "To Do": "#94a3b8",
  "In Progress": "#3b82f6",
  "In Review": "#f59e0b",
  "Done": "#22c55e",
};

type FilterType = "all" | "todo" | "in-progress" | "done" | "overdue";

export default function MyTasksPage() {
  const params = useParams();
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const fetchTasks = async () => {
    try {
      const { data } = await api.get("/tasks/mine");
      // Only tasks from current workspace
      setTasks(data.filter((t: MyTask) => t.project.workspaceId === params.workspaceId));
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [params.workspaceId]);

  const now = new Date();

  const filteredTasks = tasks.filter((t) => {
    const colName = t.column.name.toLowerCase();
    const isDone = colName.includes("done") || colName.includes("termine");
    const isOverdue = t.deadline && new Date(t.deadline) < now && !isDone;

    switch (filter) {
      case "todo": return colName.includes("to do") || colName.includes("backlog");
      case "in-progress": return colName.includes("progress") || colName.includes("review");
      case "done": return isDone;
      case "overdue": return isOverdue;
      default: return true;
    }
  });

  const overdue = tasks.filter((t) => {
    const colName = t.column.name.toLowerCase();
    const isDone = colName.includes("done") || colName.includes("termine");
    return t.deadline && new Date(t.deadline) < now && !isDone;
  });

  const done = tasks.filter((t) => {
    const colName = t.column.name.toLowerCase();
    return colName.includes("done") || colName.includes("termine");
  });

  const inProgress = tasks.filter((t) => {
    const colName = t.column.name.toLowerCase();
    return colName.includes("progress") || colName.includes("review");
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-[var(--primary)]" />
          <h1 className="text-xl sm:text-2xl font-headline font-bold">Mes taches</h1>
          <span className="text-sm text-[var(--muted-foreground)]">
            {tasks.length} tache{tasks.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total" value={tasks.length} color="text-[var(--primary)]" />
        <StatCard label="En cours" value={inProgress.length} color="text-blue-500" />
        <StatCard label="En retard" value={overdue.length} color="text-red-500" />
        <StatCard label="Terminees" value={done.length} color="text-emerald-500" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-none pb-1">
        <Filter className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
        {([
          { key: "all", label: "Toutes" },
          { key: "todo", label: "A faire" },
          { key: "in-progress", label: "En cours" },
          { key: "overdue", label: "En retard" },
          { key: "done", label: "Terminees" },
        ] as { key: FilterType; label: string }[]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === f.key
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--surface-low)] text-[var(--muted-foreground)] hover:bg-[var(--surface-high)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16">
          <ClipboardList className="h-10 w-10 text-[var(--muted-foreground)]" />
          <p className="text-sm text-[var(--muted-foreground)]">
            {filter === "all" ? "Aucune tache assignee" : "Aucune tache dans cette categorie"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const prio = priorityConfig[task.priority] || { label: "Moyenne", bg: "bg-blue-50", text: "text-blue-700" };
            const isOverdue = task.deadline && new Date(task.deadline) < now;
            const colName = task.column.name.toLowerCase();
            const isDone = colName.includes("done") || colName.includes("termine");
            const subtasksDone = task.subtasks?.filter((s) => s.done).length ?? 0;
            const subtasksTotal = task.subtasks?.length ?? 0;

            return (
              <button
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-[var(--border)] text-left transition-all hover:shadow-md hover:border-[var(--primary)]/30 ${
                  isDone ? "opacity-60" : ""
                }`}
              >
                {/* Status dot */}
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: statusColors[task.column.name] || "#94a3b8" }}
                  title={task.column.name}
                />

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className={`text-sm font-semibold truncate ${isDone ? "line-through" : ""}`}>
                      {task.title}
                    </h3>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${prio.bg} ${prio.text}`}>
                      {prio.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Project */}
                    <span className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: task.project.color }}
                      />
                      {task.project.name}
                    </span>

                    {/* Status */}
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      {task.column.name}
                    </span>

                    {/* Deadline */}
                    {task.deadline && (
                      <span className={`flex items-center gap-1 text-[11px] font-medium ${
                        isOverdue && !isDone ? "text-red-500" : "text-[var(--muted-foreground)]"
                      }`}>
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.deadline), "dd MMM", { locale: fr })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right indicators */}
                <div className="flex items-center gap-2 shrink-0">
                  {subtasksTotal > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
                      <CheckSquare className="h-3 w-3" />
                      {subtasksDone}/{subtasksTotal}
                    </span>
                  )}
                  {task.voiceNoteUrl && (
                    <Mic className="h-3.5 w-3.5 text-violet-500" />
                  )}
                  {(task._count?.attachments ?? 0) > 0 && (
                    <span className="flex items-center gap-0.5 text-[11px] text-amber-600">
                      <Paperclip className="h-3 w-3" />
                      {task._count!.attachments}
                    </span>
                  )}
                  {(task._count?.comments ?? 0) > 0 && (
                    <span className="flex items-center gap-0.5 text-[11px] text-sky-600">
                      <MessageSquare className="h-3 w-3" />
                      {task._count!.comments}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <TaskDetailSheet
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
        onUpdated={fetchTasks}
      />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3 sm:p-4">
      <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-[var(--muted-foreground)] font-medium">{label}</p>
    </div>
  );
}
