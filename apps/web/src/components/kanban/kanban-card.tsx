"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MessageSquare, Calendar, GripVertical, CheckSquare, Mic, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Task } from "@repo/types";

const priorityConfig = {
  LOW: { label: "Basse", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400" },
  MEDIUM: { label: "Moyenne", bg: "bg-[#dae2ff] dark:bg-blue-900/30", text: "text-[#003d9b] dark:text-blue-300" },
  HIGH: { label: "Haute", bg: "bg-[#ffdcc3] dark:bg-orange-900/30", text: "text-[#6a3600] dark:text-orange-300" },
  URGENT: { label: "Urgente", bg: "bg-[#ffdad6] dark:bg-red-900/30", text: "text-[#ba1a1a] dark:text-red-300" },
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

  const isOverdue = task.deadline && new Date(task.deadline) < new Date();

  const subtasksDone = task.subtasks?.filter((s) => s.done).length ?? 0;
  const subtasksTotal = task.subtasks?.length ?? 0;
  const subtaskProgress = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  const commentsCount = task._count?.comments ?? 0;
  const attachmentsCount = task._count?.attachments ?? 0;
  const hasVoice = !!task.voiceNoteUrl;
  const hasIndicators = subtasksTotal > 0 || commentsCount > 0 || attachmentsCount > 0 || hasVoice;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onTaskClick(task.id)}
      className={`bg-[var(--surface-lowest)] rounded-xl p-4 shadow-executive hover:shadow-executive-hover transition-all group cursor-grab active:cursor-grabbing border border-[var(--border)] ${
        isDragging ? "opacity-50 scale-[1.02]" : "hover:scale-[1.01] hover:border-[var(--primary)]/30"
      } ${overlay ? "shadow-lg rotate-1 scale-105" : ""}`}
    >
      {/* Header: priority + grip */}
      <div className="flex justify-between items-start mb-2">
        <span
          className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${priority.bg} ${priority.text}`}
        >
          {priority.label}
        </span>
        <GripVertical className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Title */}
      <h4 className="font-semibold text-sm text-[var(--on-surface)] leading-snug mb-2">
        {task.title}
      </h4>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-[var(--muted-foreground)] mb-2 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Subtask progress bar */}
      {subtasksTotal > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--muted-foreground)]">
              <CheckSquare className="h-3 w-3" />
              {subtasksDone}/{subtasksTotal}
            </span>
            <span className={`text-[10px] font-bold ${subtaskProgress === 100 ? "text-emerald-500" : "text-[var(--muted-foreground)]"}`}>
              {subtaskProgress}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-[var(--surface-high)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                subtaskProgress === 100 ? "bg-emerald-500" : "bg-[var(--primary)]"
              }`}
              style={{ width: `${subtaskProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Indicators row */}
      {hasIndicators && (
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {hasVoice && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              <Mic className="h-3 w-3" />
              Vocal
            </span>
          )}
          {attachmentsCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Paperclip className="h-3 w-3" />
              {attachmentsCount}
            </span>
          )}
          {commentsCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
              <MessageSquare className="h-3 w-3" />
              {commentsCount}
            </span>
          )}
        </div>
      )}

      {/* Footer: deadline + assignee */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        <div>
          {task.deadline && (
            <span
              className={`flex items-center gap-1 text-[11px] font-medium ${
                isOverdue
                  ? "text-red-600 dark:text-red-400"
                  : "text-[var(--muted-foreground)]"
              }`}
            >
              <Calendar className="h-3 w-3" />
              {format(new Date(task.deadline), "dd MMM", { locale: fr })}
            </span>
          )}
        </div>

        {/* Assignee */}
        {task.assignee ? (
          <div
            className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white dark:ring-[var(--surface-lowest)]"
            title={task.assignee.name}
          >
            {initials}
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-[var(--surface-high)] border-2 border-dashed border-[var(--muted-foreground)]/30 flex items-center justify-center">
            <span className="text-[10px] text-[var(--muted-foreground)]">?</span>
          </div>
        )}
      </div>
    </div>
  );
}
