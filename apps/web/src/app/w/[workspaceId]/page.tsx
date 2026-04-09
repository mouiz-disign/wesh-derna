"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Button } from "@/components/ui/button";
import { Plus, Kanban, Loader2 } from "lucide-react";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import type { ProjectPreview } from "@repo/types";

export default function WorkspaceDashboard() {
  const params = useParams();
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [projects, setProjects] = useState<ProjectPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get(
        `/workspaces/${params.workspaceId}/projects`,
      );
      setProjects(data);
    } catch {
      // handled by layout
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [params.workspaceId]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{workspace?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} projet{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau projet
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16">
          <Kanban className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <h3 className="font-semibold">Aucun projet</h3>
            <p className="text-sm text-muted-foreground">
              Créez votre premier projet pour commencer
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Créer un projet
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/w/${params.workspaceId}/projects/${project.id}`}
              className="group rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <h3 className="font-semibold group-hover:text-primary">
                  {project.name}
                </h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {project._count.tasks} tâche{project._count.tasks !== 1 ? "s" : ""}
              </p>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={() => {
          fetchProjects();
          setShowCreate(false);
        }}
      />
    </div>
  );
}
