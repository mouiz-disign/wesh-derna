"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Task } from "@repo/types";

const priorityConfig = {
  LOW: { label: "Basse", className: "bg-slate-100 text-slate-600 border-slate-200" },
  MEDIUM: { label: "Moyenne", className: "bg-blue-100 text-blue-700 border-blue-200" },
  HIGH: { label: "Haute", className: "bg-orange-100 text-orange-700 border-orange-200" },
  URGENT: { label: "Urgente", className: "bg-red-100 text-red-700 border-red-200" },
};

interface Props {
  task: Task;
  onTaskClick: (taskId: string) => void;
  overlay?: boolean;
}

export function KanbanCard({ task, onTaskClick, overlay }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[task.priority];
  const initials = task.assignee?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onTaskClick(task.id)}
      className={`cursor-pointer rounded-lg border bg-background p-3 shadow-sm transition-all hover:shadow-md hover:border-primary/30 ${
        isDragging ? "opacity-50" : ""
      } ${overlay ? "shadow-lg rotate-2 scale-105" : ""}`}
    >
      {/* Title */}
      <p className="text-sm font-medium leading-snug">{task.title}</p>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: tag.color + "20",
                color: tag.color,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-2.5 flex items-center gap-2">
        {/* Priority */}
        <span
          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${priority.className}`}
        >
          {priority.label}
        </span>

        {/* Deadline */}
        {task.deadline && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(task.deadline), "dd MMM", { locale: fr })}
          </span>
        )}

        {/* Comments count */}
        {task._count && task._count.comments > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            {task._count.comments}
          </span>
        )}

        {/* Assignee */}
        {task.assignee && (
          <Avatar className="ml-auto h-5 w-5">
            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}
