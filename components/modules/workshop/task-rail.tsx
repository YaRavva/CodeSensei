"use client";

import { BookOpen, Check, Lock, Star, X } from "@phosphor-icons/react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { TaskStatus, TaskWithStatus } from "./types";

const STATUS_LABEL: Record<TaskStatus, string> = {
  completed: "решено",
  in_progress: "в процессе",
  not_started: "не начато",
};

interface TaskRailProps {
  level: number;
  moduleId: string;
  title: string;
  topic: string;
  tasks: TaskWithStatus[];
  activeId: string | null;
  mode: "task" | "theory";
  hasTheory: boolean;
  completedCount: number;
  progress: number;
  xpEarned: number;
  nextModule: { id: string; title: string } | null;
  onSelect: (taskId: string) => void;
  onTheory: () => void;
  onClose: () => void;
}

export function TaskRail({
  level,
  moduleId,
  title,
  topic,
  tasks,
  activeId,
  mode,
  hasTheory,
  completedCount,
  progress,
  xpEarned,
  nextModule,
  onSelect,
  onTheory,
  onClose,
}: TaskRailProps) {
  const moduleDone = tasks.length > 0 && completedCount === tasks.length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div className="shrink-0 border-b border-sidebar-border p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="caption-3 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-foreground">
              Уровень {level}
            </span>
            <span className="truncate font-mono caption-5 text-muted-foreground">{moduleId}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть список заданий"
            className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        <h2 className="title-2 text-foreground">{title}</h2>
        <p className="mt-1 caption-2 text-muted-foreground">{topic}</p>
      </div>

      <nav aria-label="Содержание модуля" className="cs-scroll min-h-0 flex-1 overflow-y-auto p-3">
        {hasTheory && (
          <>
            <p className="caption-3 mb-2 px-1 uppercase tracking-wider text-muted-foreground">
              Материалы
            </p>
            <button
              type="button"
              onClick={onTheory}
              aria-current={mode === "theory" ? "page" : undefined}
              className={cn(
                "mb-6 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                mode === "theory" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              )}
            >
              <BookOpen size={18} className="shrink-0" />
              <span className="min-w-0">
                <span className="block body-4">Теория модуля</span>
                <span className="block caption-5 text-muted-foreground">
                  Читать перед заданиями
                </span>
              </span>
            </button>
          </>
        )}

        <p className="caption-3 mb-2 px-1 uppercase tracking-wider text-muted-foreground">
          Задания
        </p>
        <ul className="space-y-1">
          {tasks.map((task, index) => {
            const active = mode === "task" && task.id === activeId;
            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onSelect(task.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "bg-primary/10" : "hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-lg font-mono caption-4",
                      active && "ring-1 ring-primary",
                      task.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : task.status === "in_progress"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {task.status === "completed" ? <Check size={14} weight="bold" /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate body-4 text-foreground">{task.title}</span>
                    <span className="mt-0.5 block caption-5 text-muted-foreground">
                      {STATUS_LABEL[task.status]}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono caption-5 text-muted-foreground">
                    +{task.xp_reward}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 space-y-3 border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="caption-4 text-muted-foreground">Прогресс модуля</span>
          <span className="font-mono caption-3 text-foreground">
            {completedCount} / {tasks.length}
          </span>
        </div>
        <Progress value={progress} className="h-2 bg-foreground/10" />
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
          <Star size={16} weight="fill" className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="font-mono caption-4 text-foreground">{xpEarned}</span>
          <span className="caption-5 text-muted-foreground">XP за модуль</span>
        </div>
        {nextModule ? (
          moduleDone ? (
            <Link
              href={`/modules/${nextModule.id}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2 caption-4 text-primary transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="truncate">{nextModule.title}</span>
              <Check size={16} weight="bold" className="shrink-0" />
            </Link>
          ) : (
            <div
              title="Решите все задания модуля, чтобы открыть следующий"
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 caption-4 text-muted-foreground"
            >
              <span className="truncate">{nextModule.title}</span>
              <Lock size={16} className="shrink-0" />
            </div>
          )
        ) : (
          <p className="caption-5 text-muted-foreground">Это последний модуль курса.</p>
        )}
      </div>
    </div>
  );
}
