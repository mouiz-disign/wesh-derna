"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Link2, Copy, Check, Loader2, X, UserPlus, UserMinus, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import type { WorkspaceMember, ProjectMember, ProjectNotifSetting } from "@repo/types";

interface Props {
  workspaceId: string;
  projectId: string;
  projectName: string;
  open: boolean;
  onClose: () => void;
}

export function ProjectInviteDialog({ workspaceId, projectId, projectName, open, onClose }: Props) {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [generating, setGenerating] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [notifSettings, setNotifSettings] = useState<ProjectNotifSetting[]>([]);

  const workspaceMembers = workspace?.members || [];

  useEffect(() => {
    if (open) {
      api.get(`/projects/${projectId}/members`)
        .then(({ data }) => setProjectMembers(data))
        .catch(() => {});
      api.get(`/projects/${projectId}/notif-settings`)
        .then(({ data }) => setNotifSettings(data))
        .catch(() => {});
    }
  }, [open, projectId]);

  if (!open) return null;

  const projectMemberUserIds = projectMembers.map((m) => m.userId);

  // Members in workspace but NOT in this project
  const availableMembers = workspaceMembers.filter(
    (m: WorkspaceMember) => !projectMemberUserIds.includes(m.userId),
  );

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post(`/workspaces/${workspaceId}/invite`, {
        projectId,
      });
      const link = `${window.location.origin}/invite/${data.token}`;
      setInviteLink(link);
      await navigator.clipboard.writeText(link);
      toast.success("Lien d'invitation copie !");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de la generation");
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Lien copie !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddMember = async (userId: string) => {
    setLoadingUserId(userId);
    try {
      const { data } = await api.post(`/projects/${projectId}/members`, { userId });
      setProjectMembers((prev) => [...prev, data]);
      toast.success("Membre ajoute au projet");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur");
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setLoadingUserId(userId);
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      setProjectMembers((prev) => prev.filter((m) => m.userId !== userId));
      toast.success("Membre retire du projet");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur");
    } finally {
      setLoadingUserId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-[var(--surface-lowest)] rounded-2xl w-[calc(100%-2rem)] max-w-md shadow-xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-lg font-headline font-bold">
            Partager — {projectName}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-high)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
          {/* Current project members */}
          {projectMembers.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                Membres du projet ({projectMembers.length})
              </h3>
              <div className="space-y-1">
                {projectMembers.map((pm) => {
                  const initials = pm.user.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  const isLoading = loadingUserId === pm.userId;
                  return (
                    <div
                      key={pm.userId}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--surface-low)] transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{pm.user.name}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-[var(--muted-foreground)]">
                        {pm.role === "ADMIN" ? "Admin" : "Membre"}
                      </span>
                      {(() => {
                        const setting = notifSettings.find((s) => s.userId === pm.userId);
                        const isEnabled = setting?.enabled ?? true;
                        return (
                          <button
                            onClick={async () => {
                              try {
                                await api.patch(`/projects/${projectId}/notif-settings/${pm.userId}`, { enabled: !isEnabled });
                                setNotifSettings((prev) =>
                                  prev.map((s) => s.userId === pm.userId ? { ...s, enabled: !isEnabled } : s)
                                    .concat(prev.find((s) => s.userId === pm.userId) ? [] : [{ id: '', projectId, userId: pm.userId, enabled: !isEnabled, user: pm.user }]),
                                );
                                toast.success(isEnabled ? "Notifications desactivees" : "Notifications activees");
                              } catch { toast.error("Erreur"); }
                            }}
                            className={`p-1 rounded transition-colors ${isEnabled ? "text-[var(--primary)] hover:bg-[var(--primary)]/10" : "text-[var(--muted-foreground)] hover:bg-[var(--surface-high)]"}`}
                            title={isEnabled ? "Notifications activees" : "Notifications desactivees"}
                          >
                            {isEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                          </button>
                        );
                      })()}
                      {pm.role !== "ADMIN" && (
                        <button
                          onClick={() => handleRemoveMember(pm.userId)}
                          disabled={isLoading}
                          className="p-1 rounded text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          title="Retirer du projet"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserMinus className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available workspace members to add */}
          {availableMembers.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                Ajouter depuis l&apos;equipe
              </h3>
              <div className="space-y-1">
                {availableMembers.map((member: WorkspaceMember) => {
                  const initials = member.user.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  const isLoading = loadingUserId === member.userId;
                  return (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--surface-low)] transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-[var(--surface-high)] flex items-center justify-center text-[10px] font-bold text-[var(--muted-foreground)] shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.user.name}</p>
                        <p className="text-[11px] text-[var(--muted-foreground)] truncate">{member.user.email}</p>
                      </div>
                      <button
                        onClick={() => handleAddMember(member.userId)}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 transition-colors disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3" />
                            Ajouter
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Invite link for external people */}
          <div className="border-t border-[var(--border)] pt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
              Inviter une nouvelle personne
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mb-3">
              Generez un lien pour inviter quelqu&apos;un qui n&apos;est pas encore dans l&apos;equipe.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full px-4 py-2 rounded-lg text-sm font-bold border-2 border-dashed border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Generer un lien d&apos;invitation
                </>
              )}
            </button>

            {inviteLink && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <Link2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-800 dark:text-emerald-300 flex-1 truncate">
                  {inviteLink}
                </p>
                <button
                  onClick={copyLink}
                  className="p-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-800 transition-colors"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-emerald-600" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
