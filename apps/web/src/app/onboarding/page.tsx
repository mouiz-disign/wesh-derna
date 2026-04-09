"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { setCurrentWorkspace, setWorkspaces } = useWorkspaceStore();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [workspaceName, setWorkspaceName] = useState("");

  useEffect(() => {
    const checkExisting = async () => {
      try {
        const { data } = await api.get("/workspaces");
        if (data.length > 0) {
          setWorkspaces(data);
          setCurrentWorkspace(data[0]);
          router.replace(`/w/${data[0].id}`);
          return;
        }
      } catch {
        // No workspaces yet
      }
      setChecking(false);
    };
    checkExisting();
  }, [router, setCurrentWorkspace, setWorkspaces]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/workspaces", { name: workspaceName });
      setCurrentWorkspace(data);
      setWorkspaces([data]);
      toast.success("Workspace créé !");
      router.push(`/w/${data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Créer votre workspace</h1>
          <p className="text-sm text-muted-foreground text-center">
            Bienvenue{user ? `, ${user.name}` : ""} ! Créez un workspace pour
            commencer à collaborer avec votre équipe.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="workspace" className="text-sm font-medium">
              Nom du workspace
            </label>
            <Input
              id="workspace"
              type="text"
              placeholder="Mon Entreprise"
              required
              minLength={2}
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Le nom de votre entreprise ou de votre équipe
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Créer le workspace
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
