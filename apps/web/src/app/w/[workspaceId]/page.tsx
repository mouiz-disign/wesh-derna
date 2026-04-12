"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Loader2,
  ArrowRight,
  AlertTriangle,
  Rocket,
  Grid3X3,
  Shield,
} from "lucide-react";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import type { ProjectPreview } from "@repo/types";

const projectIcons = [Rocket, Grid3X3, Shield, Rocket, Grid3X3];

export default function WorkspaceDashboard() {
  const params = useParams();
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState<ProjectPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get(
        `/workspaces/${params.workspaceId}/projects`,
      );
      setProjects(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [params.workspaceId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen">
      {/* Hero Title */}
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl md:text-[2.5rem] font-headline font-extrabold tracking-tight text-[var(--on-surface)] leading-none">
          Vue d&apos;ensemble
        </h1>
        <p className="text-[var(--secondary-foreground)] mt-2">
          Bienvenue, {user?.name}. Voici l&apos;etat actuel de vos projets.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        {/* Productivity Chart */}
        <div className="col-span-12 lg:col-span-8 bg-[var(--surface-low)] rounded-xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-headline font-bold">
              Productivite de l&apos;equipe
            </h2>
            <span className="px-3 py-1 bg-[var(--surface-lowest)] text-xs font-bold rounded-lg text-[var(--primary)]">
              HEBDOMADAIRE
            </span>
          </div>
          <div className="flex-1 min-h-[200px] flex items-end gap-4 px-4 pb-8">
            {[60, 85, 45, 95, 70, 20, 15].map((h, i) => {
              const days = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
              const isWeekend = i >= 5;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className={`w-full rounded-t-xl transition-all hover:opacity-80 ${
                      isWeekend ? "bg-slate-200 dark:bg-slate-700" : "bg-[var(--primary)]"
                    }`}
                    style={{ height: `${h}%`, opacity: isWeekend ? 1 : 0.15 + (h / 100) * 0.85 }}
                  />
                  <span className="text-[10px] font-bold text-[var(--muted-foreground)]">
                    {days[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Urgent Tasks */}
        <div className="col-span-12 lg:col-span-4 gradient-primary text-white rounded-xl p-8 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div>
            <h2 className="text-2xl font-headline font-bold mb-6">
              Taches Urgentes
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/5 hover:bg-white/20 transition-all cursor-pointer">
                <AlertTriangle className="h-5 w-5 text-orange-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">Review Q4 Roadmap</p>
                  <p className="text-xs opacity-70">Deadline dans 2 heures</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/5 hover:bg-white/20 transition-all cursor-pointer">
                <AlertTriangle className="h-5 w-5 text-orange-300 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">Client Briefing</p>
                  <p className="text-xs opacity-70">En retard</p>
                </div>
              </div>
            </div>
          </div>
          <button className="mt-8 text-sm font-bold uppercase tracking-widest flex items-center gap-2 hover:gap-4 transition-all">
            VOIR TOUT <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Active Projects */}
        <div className="col-span-12">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl font-headline font-bold">
              Projets Actifs
            </h2>
            <button
              onClick={() => setShowCreate(true)}
              className="text-sm font-bold text-[var(--primary)] hover:underline"
            >
              + Nouveau projet
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="bg-[var(--surface-lowest)] rounded-xl p-12 text-center shadow-executive">
              <Rocket className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
              <h3 className="text-lg font-headline font-bold mb-2">
                Aucun projet
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-6">
                Creez votre premier projet pour commencer
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 py-3 px-6 gradient-primary text-white rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-bold">Creer un projet</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {projects.map((project, i) => {
                const Icon = projectIcons[i % projectIcons.length]!;
                const taskCount = project._count.tasks;
                const progress = Math.min(Math.round(Math.random() * 80 + 10), 100);
                return (
                  <Link
                    key={project.id}
                    href={`/w/${params.workspaceId}/projects/${project.id}`}
                    className="bg-[var(--surface-lowest)] p-6 rounded-xl shadow-executive border border-[var(--outline-variant)] group hover:scale-[1.02] transition-all duration-300"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--surface-high)] flex items-center justify-center">
                        <Icon className="h-5 w-5 text-[var(--primary)]" />
                      </div>
                      <span className="px-3 py-1 bg-[var(--surface-high)] text-[10px] font-bold uppercase rounded-full text-[var(--primary)]">
                        En Cours
                      </span>
                    </div>
                    <h3 className="text-lg font-headline font-bold text-[var(--on-surface)] mb-2">
                      {project.name}
                    </h3>
                    <p className="text-sm text-[var(--secondary-foreground)] mb-6">
                      {taskCount} tache{taskCount !== 1 ? "s" : ""} dans ce projet
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {[0, 1, 2].map((j) => (
                          <div
                            key={j}
                            className="w-8 h-8 rounded-full border-2 border-white bg-[var(--surface-high)] flex items-center justify-center text-[10px] font-bold text-[var(--muted-foreground)]"
                          >
                            {String.fromCharCode(65 + j)}
                          </div>
                        ))}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">
                          Progression
                        </p>
                        <p className="text-sm font-headline font-bold text-[var(--primary)]">
                          {progress}%
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[var(--primary)] h-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
