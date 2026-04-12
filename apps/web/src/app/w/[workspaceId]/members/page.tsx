"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  Users,
  Loader2,
  Shield,
  UserCheck,
  Eye,
  Copy,
  Check,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import type { WorkspaceMember } from "@repo/types";

const roleConfig = {
  ADMIN: { label: "Admin", icon: Shield, color: "text-[var(--primary)] bg-[#dae2ff]" },
  MEMBER: { label: "Membre", icon: UserCheck, color: "text-emerald-700 bg-emerald-100" },
  VIEWER: { label: "Viewer", icon: Eye, color: "text-slate-600 bg-slate-100" },
};

export default function MembersPage() {
  const params = useParams();
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [generating, setGenerating] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const members = workspace?.members || [];

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post(
        `/workspaces/${params.workspaceId}/invite`,
        {},
      );
      const link = `${window.location.origin}/invite/${data.token}`;
      setLastInviteLink(link);
      await navigator.clipboard.writeText(link);
      toast.success("Lien d'invitation copie !");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur lors de la generation");
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Lien copie !");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Users className="h-6 w-6 text-[var(--primary)]" />
        <h1 className="text-2xl font-headline font-extrabold tracking-tight">
          Equipe
        </h1>
        <span className="ml-2 px-2.5 py-0.5 bg-[var(--surface-high)] text-xs font-bold rounded-full text-[var(--muted-foreground)]">
          {members.length} membre{members.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Generate invite link */}
      <div className="bg-[var(--surface-lowest)] rounded-xl p-5 shadow-executive mb-6">
        <h3 className="text-sm font-headline font-bold mb-3">
          Inviter un collaborateur
        </h3>
        <p className="text-xs text-[var(--muted-foreground)] mb-4">
          Generez un lien d&apos;invitation et partagez-le par WhatsApp, email ou tout autre moyen.
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-5 py-2.5 gradient-primary text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-all hover:shadow-lg flex items-center gap-2"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Link2 className="h-4 w-4" />
              Generer un code d&apos;invitation
            </>
          )}
        </button>

        {/* Generated link */}
        {lastInviteLink && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <Link2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300 flex-1 truncate">
              {lastInviteLink}
            </p>
            <button
              onClick={() => copyLink(lastInviteLink)}
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

      {/* Members list */}
      <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-3 px-1">
        Membres actifs
      </h3>
      <div className="space-y-2">
        {members.map((member: WorkspaceMember) => {
          const role = roleConfig[member.role] || roleConfig.MEMBER;
          const RoleIcon = role.icon;
          const initials = member.user.name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={member.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-[var(--surface-lowest)] shadow-executive hover:shadow-executive-hover transition-all"
            >
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-white shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--on-surface)] truncate">
                  {member.user.name}
                </p>
                <p className="text-xs text-[var(--muted-foreground)] truncate">
                  {member.user.email}
                </p>
              </div>
              <span
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${role.color}`}
              >
                <RoleIcon className="h-3 w-3" />
                {role.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
