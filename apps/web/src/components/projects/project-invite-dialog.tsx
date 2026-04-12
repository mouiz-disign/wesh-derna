"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Link2, Copy, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  workspaceId: string;
  projectId: string;
  projectName: string;
  open: boolean;
  onClose: () => void;
}

export function ProjectInviteDialog({ workspaceId, projectId, projectName, open, onClose }: Props) {
  const [generating, setGenerating] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  if (!open) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-[var(--surface-lowest)] rounded-2xl p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-headline font-bold">
            Inviter dans {projectName}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-high)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-[var(--muted-foreground)] mb-5">
          Generez un lien d&apos;invitation pour ce projet. La personne invitee n&apos;aura acces qu&apos;a ce projet.
        </p>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full px-5 py-2.5 gradient-primary text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-all hover:shadow-lg flex items-center justify-center gap-2"
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

        {inviteLink && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
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
  );
}
