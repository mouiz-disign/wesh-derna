"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { BlockEditor } from "@/components/pages/block-editor";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface PageData {
  id: string;
  title: string;
  content: any[];
  icon: string | null;
  children: { id: string; title: string; icon: string | null }[];
}

export default function PageEditorPage() {
  const params = useParams();
  const router = useRouter();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get(`/pages/${params.pageId}`)
      .then(({ data }) => setPage(data))
      .catch(() => toast.error("Page non trouvee"))
      .finally(() => setLoading(false));
  }, [params.pageId]);

  const save = useCallback(
    async (updates: Partial<PageData>) => {
      if (!page) return;
      setSaving(true);
      try {
        const { data } = await api.put(`/pages/${page.id}`, updates);
        setPage((p) => (p ? { ...p, ...data } : p));
      } catch {
        toast.error("Erreur sauvegarde");
      } finally {
        setSaving(false);
      }
    },
    [page],
  );

  const handleDelete = async () => {
    if (!page) return;
    try {
      await api.delete(`/pages/${page.id}`);
      toast.success("Page supprimee");
      router.push(`/w/${params.workspaceId}/pages`);
    } catch {
      toast.error("Erreur suppression");
    }
  };

  if (loading || !page) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/w/${params.workspaceId}/pages`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Pages
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Sauvegarde...
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Icon + Title */}
      <div className="mb-6">
        <button
          onClick={() => {
            const icons = ["📄", "📝", "📋", "📌", "💡", "🎯", "🚀", "⭐", "📊", "🔧"];
            const current = icons.indexOf(page.icon || "📄");
            const next = icons[(current + 1) % icons.length]!;
            save({ icon: next });
            setPage((p) => (p ? { ...p, icon: next as string } : p));
          }}
          className="text-4xl mb-2 hover:scale-110 transition-transform"
        >
          {page.icon || "📄"}
        </button>
        <input
          value={page.title}
          onChange={(e) => setPage((p) => (p ? { ...p, title: e.target.value } : p))}
          onBlur={() => save({ title: page.title })}
          className="w-full bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground"
          placeholder="Sans titre"
        />
      </div>

      {/* Block editor */}
      <BlockEditor
        content={page.content}
        onChange={(content) => {
          setPage((p) => (p ? { ...p, content } : p));
          save({ content });
        }}
      />

      {/* Sub-pages */}
      {page.children.length > 0 && (
        <div className="mt-8 border-t pt-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Sous-pages
          </h3>
          <div className="flex flex-col gap-1">
            {page.children.map((child) => (
              <Link
                key={child.id}
                href={`/w/${params.workspaceId}/pages/${child.id}`}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted/50"
              >
                <span>{child.icon || "📄"}</span>
                <span>{child.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
