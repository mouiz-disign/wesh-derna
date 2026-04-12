"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { Loader2, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      {/* Mobile header + sidebar drawer */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-[#1a1d2e] border-b border-[#252839]">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger
            className="p-1.5 rounded-lg text-[#c8cad8] hover:bg-[#252839] transition-colors"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-[#1a1d2e] border-none">
            <AppSidebar mobile />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-bold text-white truncate">
          {currentWorkspace?.name || "Wesh Derna"}
        </span>
      </div>

      <main className="md:ml-64 h-screen overflow-auto pt-14 md:pt-0">{children}</main>
      <CommandPalette />
    </div>
  );
}
