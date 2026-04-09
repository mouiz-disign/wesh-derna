"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Input } from "@/components/ui/input";
import {
  Users,
  Loader2,
  Mail,
  Shield,
  UserCheck,
  Eye,
  Clock,
  Copy,
  Check,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { WorkspaceMember } from "@repo/types";

const roleConfig = {
  ADMIN: { label: "Admin", icon: Shield, color: "text-[var(--primary)] bg-[#dae2ff]" },
  MEMBER: { label: "Membre", icon: UserCheck, color: "text-emerald-700 bg-emerald-100" },
  VIEWER: { label: "Viewer", icon: Eye, color: "text-slate-600 bg-slate-100" },
};

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  createdAt: string;
}

export default function MembersPage() {
  const params = useParams();
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [lastInviteLink, setLastInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const members = workspace?.members || [];

  useEffect(() => {
    api
      .get(`/workspaces/${params.workspaceId}/invitations`)
      .then(({ data }) => setInvitations(data))
      .catch(() => {});
  }, [params.workspaceId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const { data } = await api.post(
        `/workspaces/${params.workspaceId}/invite`,
        { email },
      );
      toast.success("Invitation envoyee !");
      setLastInviteLink(data.inviteLink);
      setEmail("");
      // Refresh invitations
      const res = await api.get(`/workspaces/${params.workspaceId}/invitations`);
      setInvitations(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erreur d'invitation");
    } finally {
      setInviting(false);
    }
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Lien copie !");
    setTimeout(() => setCopied(false), 2000);
  };

  const pendingInvitations = invitations.filter((i) => i.status === "pending");

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

      {/* Invite form */}
      <div className="bg-[var(--surface-lowest)] rounded-xl p-5 shadow-executive mb-6">
        <h3 className="text-sm font-headline font-bold mb-3">
          Inviter un collaborateur
        </h3>
        <form onSubmit={handleInvite} className="flex gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@collaborateur.com"
              type="email"
              className="pl-10 bg-[var(--surface-low)] border-none"
            />
          </div>
          <button
            type="submit"
            disabled={inviting || !email.trim()}
            className="px-5 py-2 gradient-primary text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-all hover:shadow-lg"
          >
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer l'invitation"}
          </button>
        </form>

        {/* Last invite link */}
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

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-3 px-1">
            Invitations en attente ({pendingInvitations.length})
          </h3>
          <div className="space-y-2">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-[var(--surface-low)] border border-dashed border-[var(--outline-variant)]"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--on-surface)] truncate">
                    {inv.email}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Invite le {format(new Date(inv.createdAt), "dd MMM yyyy", { locale: fr })}
                  </p>
                </div>
                <button
                  onClick={() =>
                    copyLink(
                      `${window.location.origin}/invite/${inv.token}`,
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--primary)] bg-[var(--surface-high)] hover:bg-[var(--accent)] transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  Copier le lien
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
