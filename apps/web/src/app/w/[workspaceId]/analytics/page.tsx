"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  BarChart3,
  Loader2,
  FolderKanban,
  ListChecks,
  AlertTriangle,
  Users,
} from "lucide-react";

interface Stats {
  totalProjects: number;
  totalTasks: number;
  overdueTasks: number;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  tasksByAssignee: { name: string; count: number }[];
  projectStats: {
    id: string;
    name: string;
    color: string;
    total: number;
    columns: Record<string, number>;
  }[];
}

const priorityColors: Record<string, string> = {
  LOW: "#94a3b8",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  URGENT: "#ef4444",
};

const priorityLabels: Record<string, string> = {
  LOW: "Basse",
  MEDIUM: "Moyenne",
  HIGH: "Haute",
  URGENT: "Urgente",
};

export default function AnalyticsPage() {
  const params = useParams();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/workspaces/${params.workspaceId}/stats`)
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.workspaceId]);

  if (loading || !stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maxStatusCount = Math.max(...Object.values(stats.tasksByStatus), 1);
  const maxPriorityCount = Math.max(...Object.values(stats.tasksByPriority), 1);
  const maxAssigneeCount = Math.max(
    ...(stats.tasksByAssignee.length > 0
      ? stats.tasksByAssignee.map((a) => a.count)
      : [1]),
    1,
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Rapports & Analytics</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <KPICard
          icon={FolderKanban}
          label="Projets"
          value={stats.totalProjects}
          color="text-primary"
        />
        <KPICard
          icon={ListChecks}
          label="Taches totales"
          value={stats.totalTasks}
          color="text-blue-500"
        />
        <KPICard
          icon={AlertTriangle}
          label="En retard"
          value={stats.overdueTasks}
          color="text-red-500"
        />
        <KPICard
          icon={Users}
          label="Membres actifs"
          value={stats.tasksByAssignee.length}
          color="text-emerald-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks by Status */}
        <div className="rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-4">Taches par statut</h3>
          <div className="flex flex-col gap-3">
            {Object.entries(stats.tasksByStatus).map(([status, count]) => (
              <div key={status}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{status}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(count / maxStatusCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks by Priority */}
        <div className="rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-4">Taches par priorite</h3>
          <div className="flex flex-col gap-3">
            {Object.entries(stats.tasksByPriority).map(([priority, count]) => (
              <div key={priority}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: priorityColors[priority] }}
                    />
                    <span>{priorityLabels[priority] || priority}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(count / maxPriorityCount) * 100}%`,
                      backgroundColor: priorityColors[priority],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks by Assignee */}
        <div className="rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-4">Taches par membre</h3>
          {stats.tasksByAssignee.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune tache assignee</p>
          ) : (
            <div className="flex flex-col gap-3">
              {stats.tasksByAssignee.map((assignee) => (
                <div key={assignee.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {assignee.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <span>{assignee.name}</span>
                    </div>
                    <span className="font-medium">{assignee.count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${(assignee.count / maxAssigneeCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-project breakdown */}
        <div className="rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-4">Repartition par projet</h3>
          {stats.projectStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun projet</p>
          ) : (
            <div className="flex flex-col gap-4">
              {stats.projectStats.map((project) => (
                <div key={project.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="text-sm font-medium">{project.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {project.total} taches
                    </span>
                  </div>
                  {/* Stacked bar */}
                  {project.total > 0 && (
                    <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                      {Object.entries(project.columns).map(([col, count]) => {
                        if (count === 0) return null;
                        const colColors: Record<string, string> = {
                          "To Do": "#94a3b8",
                          "In Progress": "#3b82f6",
                          "In Review": "#f59e0b",
                          Done: "#22c55e",
                        };
                        return (
                          <div
                            key={col}
                            className="h-full rounded-sm"
                            style={{
                              width: `${(count / project.total) * 100}%`,
                              backgroundColor: colColors[col] || "#6366f1",
                              minWidth: "4px",
                            }}
                            title={`${col}: ${count}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
