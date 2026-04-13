"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Search,
  Bell,
  Plus,
  LogOut,
  Hash,
  Sun,
  Moon,
  MessageSquare,
  Users,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Layout,
  Folder,
  Settings,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import type { ProjectPreview, Channel, DMConversation, UnreadCounts } from "@repo/types";

export function AppSidebar({ mobile }: { mobile?: boolean }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [projects, setProjects] = useState<ProjectPreview[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({ channels: {}, dms: {} });
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showDmPicker, setShowDmPicker] = useState(false);
  const [dmSearch, setDmSearch] = useState("");
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [projRes, chanRes, notifRes, dmRes, unreadRes] = await Promise.all([
          api.get(`/workspaces/${params.workspaceId}/projects`),
          api.get(`/workspaces/${params.workspaceId}/channels`),
          api.get("/notifications/unread-count"),
          api.get(`/workspaces/${params.workspaceId}/dm-conversations`),
          api.get(`/workspaces/${params.workspaceId}/unread-counts`),
        ]);
        setProjects(projRes.data);
        setChannels(chanRes.data);
        setUnreadNotifs(notifRes.data);
        setDmConversations(dmRes.data);
        setUnreadCounts(unreadRes.data);
      } catch {}
    };
    load();

    const socket = connectSocket();
    socket.on("notification:new", () => setUnreadNotifs((c) => c + 1));
    socket.emit("presence:get");
    socket.on("presence:list", (data: { onlineUserIds: string[] }) => {
      setOnlineUsers(new Set(data.onlineUserIds));
    });
    socket.on("presence:update", (data: { userId: string; online: boolean }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (data.online) next.add(data.userId);
        else next.delete(data.userId);
        return next;
      });
    });
    // Increment unread on new DM if not currently viewing
    socket.on("dm:new", (data: { message: { authorId: string } }) => {
      const fromId = data.message.authorId;
      if (!pathname.includes(`/dm/${fromId}`)) {
        setUnreadCounts((prev) => ({
          ...prev,
          dms: { ...prev.dms, [fromId]: (prev.dms[fromId] || 0) + 1 },
        }));
        // Refresh DM conversations to update last message
        api.get(`/workspaces/${params.workspaceId}/dm-conversations`)
          .then(({ data }) => setDmConversations(data))
          .catch(() => {});
      }
    });

    return () => {
      socket.off("notification:new");
      socket.off("presence:list");
      socket.off("presence:update");
      socket.off("dm:new");
    };
  }, [params.workspaceId, pathname]);

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

  const wsMembers = workspace?.members || [];
  const filteredMembers = wsMembers.filter(
    (m: any) =>
      m.userId !== user?.id &&
      (m.user?.name || "").toLowerCase().includes(dmSearch.toLowerCase()),
  );

  return (
    <aside className={`h-full flex flex-col bg-[#1a1d2e] text-[#c8cad8] ${mobile ? "w-full" : "w-64 fixed left-0 top-0 z-50"}`}>
      {/* Brand + Avatar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">W</span>
          </div>
          <span className="text-base font-bold text-white tracking-tight">
            {workspace?.name || "Wesh Derna"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-lg text-[#8b8da0] hover:text-white hover:bg-[#252839] transition-colors"
            title={theme === "dark" ? "Mode clair" : "Mode sombre"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <div className="w-7 h-7 rounded-full bg-[#e85d3a] flex items-center justify-center text-[10px] font-bold text-white">
            {initials}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 mb-1">
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#8b8da0] hover:bg-[#252839] rounded-lg transition-colors">
          <Search className="h-4 w-4" />
          <span>Rechercher</span>
          <span className="ml-auto text-[11px] bg-[#252839] px-1.5 py-0.5 rounded text-[#6b6d80]">⌘K</span>
        </button>
      </div>

      {/* Top nav */}
      <div className="px-2 mb-2">
        <NavItem href={`/w/${params.workspaceId}/notifications`} icon={Bell} label="Boite de reception" active={pathname.includes("/notifications")} badge={unreadNotifs} />
        <NavItem href={`/w/${params.workspaceId}/messages`} icon={MessageSquare} label="Messages" active={pathname.includes("/messages") && !pathname.includes("/dm/")} />
        <NavItem href={`/w/${params.workspaceId}/my-tasks`} icon={ClipboardList} label="Mes taches" active={pathname.includes("/my-tasks")} />
      </div>

      <div className="h-px bg-[#2d3044] mx-3 mb-2" />

      <ScrollArea className="flex-1 px-2">
        {/* Espace */}
        <div className="px-1 mb-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6d80]">Espace</span>
          </div>
          <Link
            href={`/w/${params.workspaceId}`}
            className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors", pathname === `/w/${params.workspaceId}` ? "bg-[#252839] text-white" : "text-[#c8cad8] hover:bg-[#252839]")}
          >
            <div className="w-5 h-5 rounded bg-emerald-600/30 flex items-center justify-center">
              <span className="text-[10px] text-emerald-400">🏢</span>
            </div>
            <span className="font-medium">{workspace?.name}</span>
            <ChevronDown className="h-3 w-3 ml-auto text-[#6b6d80]" />
          </Link>
          <NavItem href={`/w/${params.workspaceId}/analytics`} icon={Layout} label="Apercu de l'espace" active={pathname.includes("/analytics")} />
          <NavItem href={`/w/${params.workspaceId}/members`} icon={Users} label="Equipe" active={pathname.includes("/members")} />
        </div>

        {/* Projets */}
        <div className="px-1 mb-2">
          <div className="w-full flex items-center justify-between px-2 py-1 group cursor-pointer">
            <div className="flex items-center gap-1" onClick={() => setProjectsOpen(!projectsOpen)}>
              {projectsOpen ? <ChevronDown className="h-3 w-3 text-[#6b6d80]" /> : <ChevronRight className="h-3 w-3 text-[#6b6d80]" />}
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6d80]">Projets et dossiers</span>
            </div>
            <button onClick={() => setShowCreateProject(true)} className="opacity-0 group-hover:opacity-100 text-[#6b6d80] hover:text-white transition-all">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {projectsOpen && (
            <div className="mt-1">
              {projects.map((project) => (
                <Link key={project.id} href={`/w/${params.workspaceId}/projects/${project.id}`}
                  className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors", pathname.includes(`/projects/${project.id}`) ? "bg-[#2a2d45] text-white font-medium" : "text-[#c8cad8] hover:bg-[#252839]")}>
                  <ChevronRight className="h-3 w-3 text-[#6b6d80]" />
                  <Folder className="h-4 w-4 text-blue-400" />
                  <span className="truncate">{project.name}</span>
                </Link>
              ))}
              {projects.length === 0 && <p className="px-3 py-2 text-xs text-[#6b6d80]">Aucun projet</p>}
              <button onClick={() => setShowCreateProject(true)} className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-lg text-sm font-semibold text-white bg-[#e85d3a] hover:bg-[#d14e2e] transition-colors">
                <Plus className="h-4 w-4" />
                Nouveau projet
              </button>
            </div>
          )}
        </div>

        {/* Channels */}
        <div className="px-1 mb-2">
          <button onClick={() => setChannelsOpen(!channelsOpen)} className="w-full flex items-center gap-1 px-2 py-1">
            {channelsOpen ? <ChevronDown className="h-3 w-3 text-[#6b6d80]" /> : <ChevronRight className="h-3 w-3 text-[#6b6d80]" />}
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6d80]">Channels</span>
          </button>
          {channelsOpen && (
            <div className="mt-1">
              {channels.map((channel) => {
                const chUnread = unreadCounts.channels[channel.id] || 0;
                return (
                  <Link key={channel.id} href={`/w/${params.workspaceId}/messages/${channel.id}`}
                    className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors", pathname.includes(`/messages/${channel.id}`) ? "bg-[#2a2d45] text-white" : "text-[#c8cad8] hover:bg-[#252839]")}>
                    <Hash className="h-3.5 w-3.5 text-[#6b6d80]" />
                    <span className={cn("truncate flex-1", chUnread > 0 && "font-semibold text-white")}>{channel.name}</span>
                    {chUnread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{chUnread}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Messages directs */}
        <div className="px-1 mb-2">
          <div className="w-full flex items-center justify-between px-2 py-1 group cursor-pointer">
            <div className="flex items-center gap-1" onClick={() => setDmsOpen(!dmsOpen)}>
              {dmsOpen ? <ChevronDown className="h-3 w-3 text-[#6b6d80]" /> : <ChevronRight className="h-3 w-3 text-[#6b6d80]" />}
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6d80]">Messages directs</span>
            </div>
            <button onClick={() => setShowDmPicker(!showDmPicker)} className="opacity-0 group-hover:opacity-100 text-[#6b6d80] hover:text-white transition-all">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {dmsOpen && (
            <div className="mt-1">
              {/* New DM picker */}
              {showDmPicker && (
                <div className="mb-2 mx-1 p-2 bg-[#252839] rounded-lg">
                  <input
                    autoFocus
                    value={dmSearch}
                    onChange={(e) => setDmSearch(e.target.value)}
                    placeholder="Rechercher un membre..."
                    className="w-full px-2 py-1.5 text-xs bg-[#1a1d2e] text-white rounded-md border-none outline-none placeholder:text-[#6b6d80] mb-1.5"
                  />
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {filteredMembers.map((m: any) => {
                      const mUser = m.user;
                      const mInitials = mUser?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                      return (
                        <button
                          key={m.userId}
                          onClick={() => {
                            setShowDmPicker(false);
                            setDmSearch("");
                            router.push(`/w/${params.workspaceId}/dm/${m.userId}`);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[#c8cad8] hover:bg-[#1a1d2e] transition-colors"
                        >
                          <div className="relative">
                            <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-[8px] font-bold text-white">
                              {mInitials}
                            </div>
                            {onlineUsers.has(m.userId) && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-[#252839]" />
                            )}
                          </div>
                          <span className="truncate">{mUser?.name}</span>
                        </button>
                      );
                    })}
                    {filteredMembers.length === 0 && <p className="text-[10px] text-[#6b6d80] px-2 py-1">Aucun membre</p>}
                  </div>
                </div>
              )}

              {/* DM conversations */}
              {dmConversations.map((dm) => {
                const dmInitials = dm.user.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                const dmUnread = unreadCounts.dms[dm.user.id] || 0;
                const isOnline = onlineUsers.has(dm.user.id);
                const isActive = pathname.includes(`/dm/${dm.user.id}`);
                return (
                  <Link
                    key={dm.user.id}
                    href={`/w/${params.workspaceId}/dm/${dm.user.id}`}
                    className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors", isActive ? "bg-[#2a2d45] text-white" : "text-[#c8cad8] hover:bg-[#252839]")}
                  >
                    <div className="relative shrink-0">
                      <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-[8px] font-bold text-white">
                        {dmInitials}
                      </div>
                      {isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-[#1a1d2e]" />
                      )}
                    </div>
                    <span className={cn("truncate flex-1", dmUnread > 0 && "font-semibold text-white")}>{dm.user.name}</span>
                    {dmUnread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{dmUnread}</span>
                    )}
                  </Link>
                );
              })}

              {dmConversations.length === 0 && !showDmPicker && (
                <p className="px-3 py-2 text-xs text-[#6b6d80]">Aucune conversation</p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom */}
      <div className="border-t border-[#2d3044] px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-[#8b8da0] hover:bg-[#252839] transition-colors">
            <Settings className="h-4 w-4" />
            <span>Parametres</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={handleLogout} className="text-red-500">
              <LogOut className="mr-2 h-4 w-4" />
              Se deconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CreateProjectDialog
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        onCreated={() => { setShowCreateProject(false); window.location.reload(); }}
      />
    </aside>
  );
}

function NavItem({ href, icon: Icon, label, active, badge }: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors", active ? "bg-[#252839] text-white font-medium" : "text-[#8b8da0] hover:bg-[#252839] hover:text-[#c8cad8]")}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{badge}</span>
      )}
    </Link>
  );
}
