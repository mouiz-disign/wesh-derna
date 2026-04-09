"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  differenceInDays,
  isToday,
  isSameDay,
  addWeeks,
  subWeeks,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { Project, Task } from "@repo/types";

const priorityColors: Record<string, string> = {
  LOW: "#94a3b8",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  URGENT: "#ef4444",
};

export default function TimelinePage() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    api
      .get(`/projects/${params.projectId}`)
      .then(({ data }) => setProject(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.projectId]);

  if (loading || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allTasks = project.columns.flatMap((col) =>
    col.tasks.map((t) => ({ ...t, columnName: col.name, columnColor: col.color })),
  );

  const baseDate = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset);
  const days = eachDayOfInterval({
    start: baseDate,
    end: addDays(baseDate, 27), // 4 weeks
  });

  const startDate = days[0]!;
  const endDate = days[days.length - 1]!;
  const totalDays = days.length;

  // Only tasks with deadlines
  const timelineTasks = allTasks.filter((t) => t.deadline);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href={`/w/${params.workspaceId}/projects/${params.projectId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Kanban
            </Button>
          </Link>
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-lg font-semibold">{project.name}</h1>
          <span className="text-sm text-muted-foreground">— Timeline</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(0)}
          >
            Aujourd&apos;hui
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Gantt chart */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[900px]">
          {/* Day headers */}
          <div className="flex border-b sticky top-0 bg-background z-10">
            <div className="w-56 shrink-0 border-r px-4 py-2 text-xs font-semibold text-muted-foreground">
              Tache
            </div>
            <div className="flex flex-1">
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`flex-1 border-r px-1 py-2 text-center text-[10px] ${
                    isToday(day)
                      ? "bg-primary/10 font-bold text-primary"
                      : day.getDay() === 0 || day.getDay() === 6
                        ? "bg-muted/30 text-muted-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  <div className="font-medium">
                    {format(day, "EEE", { locale: fr })}
                  </div>
                  <div>{format(day, "dd")}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Task rows */}
          {timelineTasks.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Aucune tache avec deadline. Ajoutez des dates a vos taches pour voir la timeline.
            </div>
          ) : (
            timelineTasks.map((task) => {
              const deadline = new Date(task.deadline!);
              const taskStart = addDays(deadline, -2); // Assume 2 days before deadline
              const offsetStart = Math.max(differenceInDays(taskStart, startDate), 0);
              const offsetEnd = Math.min(
                differenceInDays(deadline, startDate),
                totalDays - 1,
              );
              const barWidth = Math.max(offsetEnd - offsetStart + 1, 1);
              const isVisible = offsetEnd >= 0 && offsetStart < totalDays;

              const initials = task.assignee?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase();

              return (
                <div
                  key={task.id}
                  className="flex border-b hover:bg-muted/20 transition-colors"
                >
                  {/* Task name */}
                  <div className="w-56 shrink-0 border-r px-4 py-2 flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: task.columnColor || "#94a3b8" }}
                    />
                    <span className="text-sm truncate">{task.title}</span>
                  </div>

                  {/* Gantt bar */}
                  <div className="flex flex-1 relative" style={{ minHeight: 36 }}>
                    {/* Today line */}
                    {days.some((d) => isToday(d)) && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-primary z-10"
                        style={{
                          left: `${(differenceInDays(new Date(), startDate) / totalDays) * 100}%`,
                        }}
                      />
                    )}

                    {isVisible && (
                      <div
                        className="absolute top-1.5 h-6 rounded-md flex items-center gap-1.5 px-2 text-[10px] font-medium text-white shadow-sm"
                        style={{
                          left: `${(offsetStart / totalDays) * 100}%`,
                          width: `${(barWidth / totalDays) * 100}%`,
                          backgroundColor:
                            priorityColors[task.priority] || "#6366f1",
                          minWidth: 60,
                        }}
                      >
                        {initials && (
                          <span className="bg-white/20 rounded-sm px-1">
                            {initials}
                          </span>
                        )}
                        <span className="truncate">{task.title}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
