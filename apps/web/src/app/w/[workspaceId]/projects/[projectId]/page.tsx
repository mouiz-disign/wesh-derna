"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { Loader2, GanttChart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Project, Task } from "@repo/types";

export default function ProjectPage() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const fetchProject = async () => {
    try {
      const { data } = await api.get(`/projects/${params.projectId}`);
      setProject(data);
    } catch {
      // handled by layout
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [params.projectId]);

  if (loading || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-lg font-semibold">{project.name}</h1>
          {project.description && (
            <span className="text-sm text-muted-foreground">
              — {project.description}
            </span>
          )}
        </div>
        <Link href={`/w/${params.workspaceId}/projects/${params.projectId}/timeline`}>
          <Button variant="outline" size="sm">
            <GanttChart className="mr-1.5 h-4 w-4" />
            Timeline
          </Button>
        </Link>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto">
        <KanbanBoard
          project={project}
          onTaskClick={(taskId) => setSelectedTaskId(taskId)}
          onRefresh={fetchProject}
        />
      </div>

      {/* Task Detail */}
      <TaskDetailSheet
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
        onUpdated={fetchProject}
      />
    </div>
  );
}
