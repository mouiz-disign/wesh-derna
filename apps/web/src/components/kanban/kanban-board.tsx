"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { AddColumnButton } from "./add-column-button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Project, Task, Column } from "@repo/types";

interface Props {
  project: Project;
  onTaskClick: (taskId: string) => void;
  onRefresh: () => void;
}

export function KanbanBoard({ project, onTaskClick, onRefresh }: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [columns, setColumns] = useState<Column[]>(project.columns);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Update columns when project changes
  if (project.columns !== columns && !activeTask) {
    setColumns(project.columns);
  }

  const allTasks = columns.flatMap((col) => col.tasks);

  const findColumn = (id: string): Column | undefined => {
    // Check if id is a column
    const col = columns.find((c) => c.id === id);
    if (col) return col;
    // Check if id is a task
    return columns.find((c) => c.tasks.some((t) => t.id === id));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = allTasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeCol = findColumn(active.id as string);
    const overCol = findColumn(over.id as string);

    if (!activeCol || !overCol || activeCol.id === overCol.id) return;

    setColumns((prev) => {
      const activeTask = activeCol.tasks.find((t) => t.id === active.id);
      if (!activeTask) return prev;

      return prev.map((col) => {
        if (col.id === activeCol.id) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== active.id) };
        }
        if (col.id === overCol.id) {
          const overIndex = col.tasks.findIndex((t) => t.id === over.id);
          const newTasks = [...col.tasks];
          const insertIndex = overIndex >= 0 ? overIndex : newTasks.length;
          newTasks.splice(insertIndex, 0, { ...activeTask, columnId: col.id });
          return { ...col, tasks: newTasks };
        }
        return col;
      });
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const overCol = findColumn(over.id as string);
    if (!overCol) return;

    const taskIndex = overCol.tasks.findIndex((t) => t.id === active.id);

    try {
      await api.patch(`/tasks/${active.id}/move`, {
        columnId: overCol.id,
        order: taskIndex >= 0 ? taskIndex : 0,
      });
      onRefresh();
    } catch {
      toast.error("Erreur lors du déplacement");
      onRefresh();
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-6 p-6">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            projectId={project.id}
            onTaskClick={onTaskClick}
            onRefresh={onRefresh}
          />
        ))}
        <AddColumnButton projectId={project.id} onRefresh={onRefresh} />
      </div>

      <DragOverlay>
        {activeTask ? (
          <KanbanCard task={activeTask} onTaskClick={() => {}} overlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
