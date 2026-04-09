"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { Loader2 } from "lucide-react";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { setCurrentWorkspace, currentWorkspace } = useWorkspaceStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!token && !loading) {
      router.replace("/login");
      return;
    }

    const fetchWorkspace = async () => {
      try {
        const { data } = await api.get(`/workspaces/${params.workspaceId}`);
        setCurrentWorkspace(data);
      } catch {
        router.replace("/onboarding");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchWorkspace();
    }
  }, [token, params.workspaceId, router, setCurrentWorkspace, loading]);

  if (loading || !currentWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[var(--background)]">
      <AppSidebar />
      <main className="ml-64 h-screen overflow-auto">{children}</main>
      <CommandPalette />
    </div>
  );
}
