"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Kanban,
  MessageSquare,
  Bell,
  Plus,
  LogOut,
  FolderKanban,
  Hash,
  ChevronDown,
  Users,
  Sun,
  Moon,
  BarChart3,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { connectSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { ProjectPreview, Channel, Notification } from "@repo/types";

export function AppSidebar() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [projects, setProjects] = useState<ProjectPreview[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [projRes, chanRes, notifRes] = await Promise.all([
          api.get(`/workspaces/${params.workspaceId}/projects`),
          api.get(`/workspaces/${params.workspaceId}/channels`),
          api.get("/notifications/unread-count"),
        ]);
        setProjects(projRes.data);
        setChannels(chanRes.data);
        setUnreadCount(notifRes.data);
      } catch {
        // handled by layout
      }
    };
    load();

    // Listen for new notifications
    const socket = connectSocket();
    socket.on("notification:new", () => {
      setUnreadCount((c) => c + 1);
    });
    return () => {
      socket.off("notification:new");
    };
  }, [params.workspaceId]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Workspace header */}
      <div className="flex items-center gap-2 border-b p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          {workspace?.name?.charAt(0)?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold">{workspace?.name}</p>
          <p className="text-xs text-muted-foreground">
            {workspace?.members?.length || 0} membre
            {(workspace?.members?.length || 0) !== 1 ? "s" : ""}
          </p>
        </div>
        {/* Dark mode toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
        >
          <Sun className="h-4 w-4 hidden dark:block" />
          <Moon className="h-4 w-4 block dark:hidden" />
        </button>
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        {/* Navigation */}
        <div className="mb-4">
          <NavItem
            href={`/w/${params.workspaceId}`}
            icon={FolderKanban}
            label="Dashboard"
            active={pathname === `/w/${params.workspaceId}`}
          />
          <NavItem
            href={`/w/${params.workspaceId}/messages`}
            icon={MessageSquare}
            label="Messages"
            active={pathname.includes("/messages")}
          />
          <NavItem
            href={`/w/${params.workspaceId}/notifications`}
            icon={Bell}
            label="Notifications"
            active={pathname.includes("/notifications")}
            badge={unreadCount}
          />
          <NavItem
            href={`/w/${params.workspaceId}/members`}
            icon={Users}
            label="Membres"
            active={pathname.includes("/members")}
          />
          <NavItem
            href={`/w/${params.workspaceId}/analytics`}
            icon={BarChart3}
            label="Analytics"
            active={pathname.includes("/analytics")}
          />
          <NavItem
            href={`/w/${params.workspaceId}/pages`}
            icon={FileText}
            label="Pages"
            active={pathname.includes("/pages")}
          />
        </div>

        <Separator className="mb-3" />

        {/* Projects */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Projets
            </span>
            <Link href={`/w/${params.workspaceId}?new=true`}>
              <Plus className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </Link>
          </div>
          {projects.map((project) => (
            <NavItem
              key={project.id}
              href={`/w/${params.workspaceId}/projects/${project.id}`}
              label={project.name}
              active={pathname.includes(`/projects/${project.id}`)}
              dot={project.color}
            />
          ))}
          {projects.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              Aucun projet
            </p>
          )}
        </div>

        <Separator className="mb-3" />

        {/* Channels */}
        <div>
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Channels
            </span>
            <Plus className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
          </div>
          {channels.map((channel) => (
            <NavItem
              key={channel.id}
              href={`/w/${params.workspaceId}/messages/${channel.id}`}
              icon={Hash}
              label={channel.name}
              active={pathname.includes(`/messages/${channel.id}`)}
            />
          ))}
          {channels.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              Aucun channel
            </p>
          )}
        </div>
      </ScrollArea>

      {/* User footer */}
      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md p-2 text-sm hover:bg-sidebar-accent">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-left text-sm">
              {user?.name}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Se deconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  dot,
  badge,
}: {
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  dot?: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      {dot ? (
        <div
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: dot }}
        />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0" />
      ) : null}
      <span className="truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}
