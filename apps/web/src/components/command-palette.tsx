"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  FolderKanban,
  MessageSquare,
  Bell,
  Users,
  Sun,
  Moon,
  LogOut,
  Plus,
  Hash,
  Search,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";
import type { ProjectPreview, Channel } from "@repo/types";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectPreview[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const router = useRouter();
  const params = useParams();
  const { theme, setTheme } = useTheme();
  const logout = useAuthStore((s) => s.logout);
  const workspaceId = params.workspaceId as string | undefined;

  // ⌘K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Load data when opened
  useEffect(() => {
    if (!open || !workspaceId) return;
    const load = async () => {
      try {
        const [p, c] = await Promise.all([
          api.get(`/workspaces/${workspaceId}/projects`),
          api.get(`/workspaces/${workspaceId}/channels`),
        ]);
        setProjects(p.data);
        setChannels(c.data);
      } catch {}
    };
    load();
  }, [open, workspaceId]);

  const go = useCallback(
    (path: string) => {
      router.push(path);
      setOpen(false);
    },
    [router],
  );

  const handleLogout = () => {
    logout();
    router.push("/login");
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Rechercher une page, un projet, un channel..." />
      <CommandList>
        <CommandEmpty>Aucun resultat.</CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => go(`/w/${workspaceId}`)}>
            <FolderKanban className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go(`/w/${workspaceId}/messages`)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Messages
          </CommandItem>
          <CommandItem onSelect={() => go(`/w/${workspaceId}/notifications`)}>
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </CommandItem>
          <CommandItem onSelect={() => go(`/w/${workspaceId}/members`)}>
            <Users className="mr-2 h-4 w-4" />
            Membres
          </CommandItem>
        </CommandGroup>

        {/* Projects */}
        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projets">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() =>
                    go(`/w/${workspaceId}/projects/${project.id}`)
                  }
                >
                  <div
                    className="mr-2 h-3 w-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  {project.name}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {project._count.tasks} taches
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Channels */}
        {channels.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Channels">
              {channels.map((channel) => (
                <CommandItem
                  key={channel.id}
                  onSelect={() =>
                    go(`/w/${workspaceId}/messages/${channel.id}`)
                  }
                >
                  <Hash className="mr-2 h-4 w-4" />
                  {channel.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Actions */}
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              setOpen(false);
            }}
          >
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            {theme === "dark" ? "Mode clair" : "Mode sombre"}
          </CommandItem>
          <CommandItem onSelect={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Se deconnecter
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
