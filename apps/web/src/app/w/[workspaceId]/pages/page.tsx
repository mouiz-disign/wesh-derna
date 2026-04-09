"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

interface Page {
  id: string;
  title: string;
  icon: string | null;
  updatedAt: string;
  author: { id: string; name: string };
  children: { id: string; title: string; icon: string | null }[];
}

export default function PagesListPage() {
  const params = useParams();
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPages = async () => {
    try {
      const { data } = await api.get(`/workspaces/${params.workspaceId}/pages`);
      setPages(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, [params.workspaceId]);

  const createPage = async () => {
    try {
      const { data } = await api.post(`/workspaces/${params.workspaceId}/pages`, {
        title: "Sans titre",
      });
      router.push(`/w/${params.workspaceId}/pages/${data.id}`);
    } catch {
      toast.error("Erreur creation page");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Pages</h1>
        </div>
        <Button onClick={createPage} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Nouvelle page
        </Button>
      </div>

      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Aucune page. Creez votre premiere page pour documenter.
          </p>
          <Button onClick={createPage} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Creer une page
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {pages.map((page) => (
            <Link
              key={page.id}
              href={`/w/${params.workspaceId}/pages/${page.id}`}
              className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-muted/50 transition-colors group"
            >
              <span className="text-lg">{page.icon || "📄"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium group-hover:text-primary truncate">
                  {page.title}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {page.author.name} · {format(new Date(page.updatedAt), "dd MMM yyyy", { locale: fr })}
                </p>
              </div>
              {page.children.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {page.children.length} sous-page{page.children.length > 1 ? "s" : ""}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
