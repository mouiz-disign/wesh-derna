"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { Task } from "@repo/types";

type CalendarTask = Task & {
  column: { id: string; name: string; color: string };
  project: { id: string; name: string; color: string; workspaceId: string };
};

const priorityBg: Record<string, string> = {
  LOW: "bg-slate-200 dark:bg-slate-700",
  MEDIUM: "bg-blue-200 dark:bg-blue-800",
  HIGH: "bg-orange-200 dark:bg-orange-800",
  URGENT: "bg-red-200 dark:bg-red-800",
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function CalendarPage() {
  const params = useParams();
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedDayTasks, setSelectedDayTasks] = useState<CalendarTask[] | null>(null);

  const fetchTasks = async () => {
    try {
      const { data } = await api.get("/tasks/mine");
      setTasks(
        data.filter(
          (t: CalendarTask) =>
            t.project.workspaceId === params.workspaceId && t.deadline,
        ),
      );
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [params.workspaceId]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getTasksForDay = (day: Date) =>
    tasks.filter((t) => t.deadline && isSameDay(new Date(t.deadline), day));

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-[var(--primary)]" />
          <h1 className="text-xl sm:text-2xl font-headline font-bold">Calendrier</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-[var(--surface-low)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-[var(--surface-low)] transition-colors"
          >
            Aujourd&apos;hui
          </button>
          <h2 className="text-lg font-bold min-w-[180px] text-center capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-[var(--surface-low)] transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px mb-px">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px flex-1 bg-[var(--border)] rounded-xl overflow-hidden">
        {days.map((day) => {
          const dayTasks = getTasksForDay(day);
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              onClick={() => dayTasks.length > 0 && setSelectedDayTasks(dayTasks)}
              className={`bg-[var(--background)] p-1.5 min-h-[80px] sm:min-h-[100px] flex flex-col transition-colors ${
                inMonth ? "" : "opacity-40"
              } ${dayTasks.length > 0 ? "cursor-pointer hover:bg-[var(--surface-low)]" : ""}`}
            >
              {/* Day number */}
              <span
                className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                  today
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--on-surface)]"
                }`}
              >
                {format(day, "d")}
              </span>

              {/* Tasks - desktop shows details, mobile shows dots */}
              <div className="flex-1 space-y-0.5 overflow-hidden">
                {/* Desktop */}
                <div className="hidden sm:block space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => (
                    <button
                      key={task.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task.id); }}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${priorityBg[task.priority] || "bg-[var(--surface-high)]"}`}
                      title={task.title}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                        style={{ backgroundColor: task.project.color }}
                      />
                      {task.title}
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[10px] text-[var(--muted-foreground)] px-1.5">
                      +{dayTasks.length - 3} de plus
                    </span>
                  )}
                </div>

                {/* Mobile - dots */}
                <div className="flex sm:hidden gap-0.5 flex-wrap">
                  {dayTasks.slice(0, 4).map((task) => (
                    <span
                      key={task.id}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: task.project.color }}
                    />
                  ))}
                  {dayTasks.length > 4 && (
                    <span className="text-[9px] text-[var(--muted-foreground)]">
                      +{dayTasks.length - 4}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Day detail overlay (mobile) */}
      {selectedDayTasks && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelectedDayTasks(null)}
        >
          <div
            className="bg-[var(--background)] rounded-xl w-full max-w-sm max-h-[60vh] overflow-y-auto p-4 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold mb-3">
              {selectedDayTasks[0]?.deadline &&
                format(new Date(selectedDayTasks[0].deadline), "EEEE dd MMMM", { locale: fr })}
            </h3>
            {selectedDayTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => { setSelectedTaskId(task.id); setSelectedDayTasks(null); }}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--surface-low)] text-left transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: task.project.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">{task.project.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <TaskDetailSheet
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
        onUpdated={fetchTasks}
      />
    </div>
  );
}
