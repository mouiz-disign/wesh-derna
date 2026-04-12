"use client";

import { useState, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanCard } from "./kanban-card";
import { CreateTaskInline } from "../tasks/create-task-inline";
import { Plus, MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Column } from "@repo/types";

interface Props {
  column: Column;
  projectId: string;
  onTaskClick: (taskId: string) => void;
  onRefresh: () => void;
}

export function KanbanColumn({ column, projectId, onTaskClick, onRefresh }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const handleRename = async () => {
    if (!editName.trim() || editName === column.name) {
      setEditing(false);
      setEditName(column.name);
      return;
    }
    try {
      await api.put(`/columns/${column.id}`, { name: editName.trim() });
      toast.success("Colonne renommee");
      onRefresh();
    } catch {
      toast.error("Erreur");
    }
    setEditing(false);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/columns/${column.id}`);
      toast.success("Colonne supprimee");
      onRefresh();
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div className="flex-shrink-0 w-[270px] sm:w-80 flex flex-col">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: column.color || "#94a3b8" }}
          />

          {editing ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") { setEditing(false); setEditName(column.name); }
                }}
                autoFocus
                className="flex-1 text-xs font-bold uppercase tracking-wider bg-[var(--surface-low)] rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-[var(--primary)]/30 border border-[var(--border)]"
              />
              <button onClick={handleRename} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => { setEditing(false); setEditName(column.name); }} className="p-1 text-[var(--muted-foreground)] hover:bg-[var(--surface-high)] rounded-md">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <h3
              className="font-bold text-[var(--on-surface)] uppercase tracking-wider text-xs cursor-pointer hover:text-[var(--primary)] transition-colors"
              onDoubleClick={() => setEditing(true)}
              title="Double-cliquez pour renommer"
            >
              {column.name}
            </h3>
          )}

          <span className="bg-[var(--surface-high)] text-[var(--on-surface-variant)] text-[11px] px-2.5 py-0.5 rounded-full font-bold min-w-[24px] text-center shrink-0">
            {column.tasks.length}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="p-1 rounded-md text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--surface-high)] transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Renommer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-3 min-h-[80px] transition-colors rounded-xl p-1 ${
          isOver ? "bg-[var(--primary)]/5 ring-2 ring-dashed ring-[var(--primary)]/20" : ""
        }`}
      >
        <SortableContext
          items={column.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onTaskClick={onTaskClick} />
          ))}
        </SortableContext>

        {showCreate && (
          <CreateTaskInline
            columnId={column.id}
            projectId={projectId}
            onCreated={() => { setShowCreate(false); onRefresh(); }}
            onCancel={() => setShowCreate(false)}
          />
        )}

        <button
          onClick={() => setShowCreate(true)}
          className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-[var(--muted-foreground)] font-bold text-xs uppercase tracking-widest hover:border-[var(--primary)]/40 hover:text-[var(--primary)] transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>
    </div>
  );
}
