"use client";

import { BookOpen, Check, Lock, Star, X } from "@phosphor-icons/react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { TaskStatus, TaskWithStatus } from "./types";

const DOT: Record<TaskStatus, string> = {
  completed: "bg-emerald-500",
  in_progress: "bg-amber-500",
  not_started: "bg-muted-foreground/40",
};

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
    <div className="flex h-full min-h-0 flex-col bg-[var(--sidebar)]">
      <div className="shrink-0 border-b p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 caption-3 uppercase tracking-wider text-primary">
            Уровень {level} · {moduleId}
          </span>
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
        <p className="px-1 pb-2 caption-3 uppercase tracking-wider text-muted-foreground">
          Материалы
        </p>
        {hasTheory && (
          <button
            type="button"
            onClick={onTheory}
            aria-current={mode === "theory" ? "page" : undefined}
            className={cn(
              "mb-4 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              mode === "theory"
                ? "border-primary/40 bg-primary/10"
                : "border-transparent hover:bg-accent"
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-background text-muted-foreground">
              <BookOpen size={16} />
            </span>
            <span className="min-w-0">
              <span className="block body-4 text-foreground">Теория модуля</span>
              <span className="block caption-5 text-muted-foreground">Читать перед заданиями</span>
            </span>
          </button>
        )}

        <p className="px-1 pb-2 caption-3 uppercase tracking-wider text-muted-foreground">
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
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary/40 bg-primary/10"
                      : "border-transparent hover:bg-accent"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-lg border font-mono text-xs font-medium",
                      task.status === "completed"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-background text-muted-foreground"
                    )}
                  >
                    {task.status === "completed" ? <Check size={16} weight="bold" /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate body-4 text-foreground">{task.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 caption-5 text-muted-foreground">
                      <span className={cn("size-1.5 rounded-full", DOT[task.status])} />
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

      <div className="shrink-0 space-y-3 border-t p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="caption-4 text-muted-foreground">Прогресс модуля</span>
          <span className="font-mono caption-3 text-foreground">
            {completedCount} / {tasks.length}
          </span>
        </div>
        <Progress value={progress} className="h-2 bg-foreground/10" />
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <Star size={16} weight="fill" className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="font-mono caption-3 text-amber-700 dark:text-amber-400">{xpEarned}</span>
          <span className="caption-5 text-amber-700/80 dark:text-amber-400/80">XP за модуль</span>
        </div>
        {nextModule ? (
          moduleDone ? (
            <Link
              href={`/modules/${nextModule.id}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 caption-3 text-primary transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="truncate">{nextModule.title}</span>
              <Check size={16} weight="bold" className="shrink-0" />
            </Link>
          ) : (
            <div
              title="Решите все задания модуля, чтобы открыть следующий"
              className="flex items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 caption-4 text-muted-foreground"
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
