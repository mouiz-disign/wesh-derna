"use client";

import { useState, useEffect, useRef } from "react";
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
  arrayMove,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { AddColumnButton } from "./add-column-button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Project, Task, Column, UserPreview } from "@repo/types";

interface Props {
  project: Project;
  onTaskClick: (taskId: string) => void;
  onRefresh: () => void;
  filterAssigneeId?: string | null;
  members?: UserPreview[];
}

export function KanbanBoard({ project, onTaskClick, onRefresh, filterAssigneeId, members = [] }: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [columns, setColumns] = useState<Column[]>(project.columns);
  const prevProjectIdRef = useRef(project.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    if (!activeTask) {
      setColumns(project.columns);
    }
    prevProjectIdRef.current = project.id;
  }, [project.columns, project.id, activeTask]);

  const allTasks = columns.flatMap((col) => col.tasks);

  const findColumn = (id: string): Column | undefined => {
    const col = columns.find((c) => c.id === id);
    if (col) return col;
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

    if (!activeCol || !overCol) return;

    // Same column — reorder
    if (activeCol.id === overCol.id) {
      setColumns((prev) =>
        prev.map((col) => {
          if (col.id !== activeCol.id) return col;
          const oldIndex = col.tasks.findIndex((t) => t.id === active.id);
          const newIndex = col.tasks.findIndex((t) => t.id === over.id);
          if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return col;
          return { ...col, tasks: arrayMove(col.tasks, oldIndex, newIndex) };
        }),
      );
      return;
    }

    // Cross column — move task
    setColumns((prev) => {
      const task = activeCol.tasks.find((t) => t.id === active.id);
      if (!task) return prev;

      return prev.map((col) => {
        if (col.id === activeCol.id) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== active.id) };
        }
        if (col.id === overCol.id) {
          const overIndex = col.tasks.findIndex((t) => t.id === over.id);
          const newTasks = [...col.tasks];
          const insertIndex = overIndex >= 0 ? overIndex : newTasks.length;
          newTasks.splice(insertIndex, 0, { ...task, columnId: col.id });
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
      toast.error("Erreur lors du deplacement");
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
      <div className="flex h-full gap-3 sm:gap-4 md:gap-6 p-3 sm:p-4 md:p-6 overflow-x-auto">
        {columns.map((column) => {
          const filteredColumn = filterAssigneeId
            ? { ...column, tasks: column.tasks.filter((t) => {
                const ids: string[] = (t.assigneeIds as string[]) || (t.assigneeId ? [t.assigneeId] : []);
                return ids.includes(filterAssigneeId);
              })}
            : column;
          return (
            <KanbanColumn
              key={column.id}
              column={filteredColumn}
              projectId={project.id}
              onTaskClick={onTaskClick}
              onRefresh={onRefresh}
              members={members}
            />
          );
        })}
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
