"use client";

import { useState, useEffect } from "react";
import { Plus, LayoutTemplate, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  description: string;
  columns: { name: string; color: string }[];
}

interface Props {
  projectId: string;
  onRefresh: () => void;
}

export function AddColumnButton({ projectId, onRefresh }: Props) {
  const [mode, setMode] = useState<"idle" | "add" | "templates">("idle");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#94a3b8");
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [applyingTemplate, setApplyingTemplate] = useState("");

  const colors = [
    "#94a3b8", "#3b82f6", "#8b5cf6", "#ec4899",
    "#f59e0b", "#06b6d4", "#22c55e", "#ef4444",
  ];

  useEffect(() => {
    if (mode === "templates" && templates.length === 0) {
      api.get("/column-templates").then(({ data }) => setTemplates(data)).catch(() => {});
    }
  }, [mode, templates.length]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await api.post(`/projects/${projectId}/columns`, { name: name.trim(), color });
      toast.success("Colonne ajoutee");
      setName("");
      setMode("idle");
      onRefresh();
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    setApplyingTemplate(templateId);
    try {
      await api.post(`/projects/${projectId}/apply-template`, { template: templateId });
      toast.success("Template applique !");
      setMode("idle");
      onRefresh();
    } catch {
      toast.error("Erreur application template");
    } finally {
      setApplyingTemplate("");
    }
  };

  if (mode === "idle") {
    return (
      <div className="flex-shrink-0 w-72 flex flex-col gap-2">
        <button
          onClick={() => setMode("add")}
          className="w-full py-3 border-2 border-dashed border-[var(--border)] rounded-xl text-[var(--muted-foreground)] font-bold text-xs uppercase tracking-widest hover:border-[var(--primary)]/40 hover:text-[var(--primary)] transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvelle colonne
        </button>
        <button
          onClick={() => setMode("templates")}
          className="w-full py-2.5 rounded-xl text-[var(--muted-foreground)] text-xs font-medium hover:text-[var(--primary)] hover:bg-[var(--surface-low)] transition-all flex items-center justify-center gap-2"
        >
          <LayoutTemplate className="h-3.5 w-3.5" />
          Utiliser un modele
        </button>
      </div>
    );
  }

  if (mode === "add") {
    return (
      <div className="flex-shrink-0 w-72 bg-[var(--surface-lowest)] rounded-xl p-4 shadow-executive border border-[var(--border)] space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
            Nouvelle colonne
          </h4>
          <button onClick={() => setMode("idle")} className="p-1 rounded-md hover:bg-[var(--surface-high)]">
            <X className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          </button>
        </div>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setMode("idle"); }}
          placeholder="Nom de la colonne..."
          className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--surface-low)] border-none outline-none focus:ring-2 focus:ring-[var(--primary)]/30 placeholder:text-[var(--muted-foreground)]"
        />

        <div className="flex gap-1.5">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full transition-all ${
                color === c ? "ring-2 ring-offset-1 ring-[var(--primary)] scale-110" : "hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <button
          onClick={handleAdd}
          disabled={loading || !name.trim()}
          className="w-full py-2 gradient-primary text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-all hover:shadow-md"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : "Ajouter"}
        </button>
      </div>
    );
  }

  // Templates mode
  return (
    <div className="flex-shrink-0 w-80 bg-[var(--surface-lowest)] rounded-xl p-4 shadow-executive border border-[var(--border)] space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
          Modeles de colonnes
        </h4>
        <button onClick={() => setMode("idle")} className="p-1 rounded-md hover:bg-[var(--surface-high)]">
          <X className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
        </button>
      </div>

      <p className="text-[11px] text-[var(--muted-foreground)]">
        Remplace toutes les colonnes actuelles par un modele pre-configure.
      </p>

      <div className="space-y-2">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => handleApplyTemplate(tpl.id)}
            disabled={!!applyingTemplate}
            className="w-full text-left p-3 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold group-hover:text-[var(--primary)] transition-colors">
                {tpl.name}
              </span>
              {applyingTemplate === tpl.id && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--primary)]" />
              )}
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] mb-2">
              {tpl.description}
            </p>
            <div className="flex flex-wrap gap-1">
              {tpl.columns.map((col) => (
                <span
                  key={col.name}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--surface-low)]"
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color }} />
                  {col.name}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
