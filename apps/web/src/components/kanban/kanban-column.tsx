"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanCard } from "./kanban-card";
import { CreateTaskInline } from "../tasks/create-task-inline";
import { Plus } from "lucide-react";
import type { Column } from "@repo/types";

interface Props {
  column: Column;
  projectId: string;
  onTaskClick: (taskId: string) => void;
  onRefresh: () => void;
}

export function KanbanColumn({ column, projectId, onTaskClick, onRefresh }: Props) {
  const [showCreate, setShowCreate] = useState(false);

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/40">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-3">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: column.color || "#94a3b8" }}
        />
        <h3 className="text-sm font-semibold">{column.name}</h3>
        <span className="ml-1 text-xs text-muted-foreground">
          {column.tasks.length}
        </span>
        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 min-h-[80px] transition-colors rounded-b-lg ${
          isOver ? "bg-primary/5" : ""
        }`}
      >
        <SortableContext
          items={column.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onTaskClick={onTaskClick}
            />
          ))}
        </SortableContext>

        {showCreate && (
          <CreateTaskInline
            columnId={column.id}
            projectId={projectId}
            onCreated={() => {
              setShowCreate(false);
              onRefresh();
            }}
            onCancel={() => setShowCreate(false)}
          />
        )}
      </div>
    </div>
  );
}
