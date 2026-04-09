"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  User,
  Flag,
  MessageSquare,
  Loader2,
  Send,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Task, Comment } from "@repo/types";

const priorityOptions = [
  { value: "LOW", label: "Basse", color: "bg-slate-100 text-slate-600" },
  { value: "MEDIUM", label: "Moyenne", color: "bg-blue-100 text-blue-700" },
  { value: "HIGH", label: "Haute", color: "bg-orange-100 text-orange-700" },
  { value: "URGENT", label: "Urgente", color: "bg-red-100 text-red-700" },
];

interface Props {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function TaskDetailSheet({ taskId, open, onOpenChange, onUpdated }: Props) {
  const [task, setTask] = useState<(Task & { comments: Comment[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    if (!taskId || !open) return;
    setLoading(true);
    api
      .get(`/tasks/${taskId}`)
      .then(({ data }) => {
        setTask(data);
        setTitle(data.title);
        setDescription(data.description || "");
      })
      .catch(() => toast.error("Erreur chargement tache"))
      .finally(() => setLoading(false));
  }, [taskId, open]);

  const updateField = async (field: string, value: string) => {
    if (!taskId) return;
    try {
      await api.put(`/tasks/${taskId}`, { [field]: value });
      onUpdated();
    } catch {
      toast.error("Erreur mise a jour");
    }
  };

  const handleTitleBlur = () => {
    if (title !== task?.title && title.trim()) {
      updateField("title", title);
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== (task?.description || "")) {
      updateField("description", description);
    }
  };

  const handlePriorityChange = async (priority: string) => {
    if (!taskId) return;
    try {
      await api.put(`/tasks/${taskId}`, { priority });
      setTask((prev) => (prev ? { ...prev, priority: priority as any } : null));
      onUpdated();
    } catch {
      toast.error("Erreur mise a jour");
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !taskId) return;
    setSendingComment(true);
    try {
      const { data } = await api.post(`/tasks/${taskId}/comments`, {
        content: comment.trim(),
      });
      setTask((prev) =>
        prev ? { ...prev, comments: [...prev.comments, data] } : null,
      );
      setComment("");
    } catch {
      toast.error("Erreur envoi commentaire");
    } finally {
      setSendingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success("Tache supprimee");
      onOpenChange(false);
      onUpdated();
    } catch {
      toast.error("Erreur suppression");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {loading || !task ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-6 pt-6">
            <SheetHeader>
              <SheetTitle className="sr-only">Detail tache</SheetTitle>
            </SheetHeader>

            {/* Title */}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="border-none text-xl font-bold p-0 h-auto shadow-none focus-visible:ring-0"
            />

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Ajouter une description..."
                className="w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <Separator />

            {/* Meta */}
            <div className="grid gap-4">
              {/* Priority */}
              <div className="flex items-center gap-3">
                <Flag className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm w-20 text-muted-foreground">Priorite</span>
                <div className="flex gap-1.5">
                  {priorityOptions.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => handlePriorityChange(p.value)}
                      className={`rounded-md px-2 py-0.5 text-xs font-medium transition-all ${
                        task.priority === p.value
                          ? p.color + " ring-1 ring-offset-1 ring-current"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignee */}
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm w-20 text-muted-foreground">Assigne</span>
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {task.assignee.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{task.assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Non assigne</span>
                )}
              </div>

              {/* Deadline */}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm w-20 text-muted-foreground">Echeance</span>
                <input
                  type="date"
                  value={
                    task.deadline
                      ? new Date(task.deadline).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => {
                    if (e.target.value) updateField("deadline", e.target.value);
                  }}
                  className="rounded-md border bg-transparent px-2 py-1 text-sm"
                />
              </div>
            </div>

            <Separator />

            {/* Comments */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Commentaires ({task.comments?.length || 0})
                </span>
              </div>

              <div className="flex flex-col gap-3 mb-4 max-h-60 overflow-y-auto">
                {task.comments?.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                      <AvatarFallback className="text-[10px] bg-muted">
                        {c.author.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium">
                          {c.author.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(c.createdAt), "dd MMM HH:mm", {
                            locale: fr,
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {c.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendComment} className="flex gap-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ecrire un commentaire..."
                  className="h-9 text-sm"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={sendingComment || !comment.trim()}
                  className="h-9"
                >
                  {sendingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>

            <Separator />

            {/* Delete */}
            <Button
              variant="outline"
              onClick={handleDelete}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer la tache
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
