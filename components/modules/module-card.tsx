"use client";

import type { Database } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

type Module = Database["public"]["Tables"]["modules"]["Row"];

type ModuleStatus = "not_started" | "in_progress" | "completed";

interface ModuleCardProps {
  module: Module;
  status: ModuleStatus;
  tasksCount?: number;
}

const statusConfig: Record<
  ModuleStatus,
  { label: string; icon: string; tone: string }
> = {
  not_started: {
    label: "Не начат",
    icon: "⏳",
    tone: "border-muted bg-muted/40 text-muted-foreground",
  },
  in_progress: {
    label: "В процессе",
    icon: "🚀",
    tone: "border-primary/60 bg-primary/10 text-primary",
  },
  completed: {
    label: "Завершен",
    icon: "✅",
    tone: "border-emerald-500/60 bg-emerald-500/10 text-emerald-400",
  },
};

export function ModuleCard({ module, status, tasksCount }: ModuleCardProps) {
  const statusInfo = statusConfig[status];
  const isCompleted = status === "completed";

  return (
    <Card
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300 ${isCompleted
          ? "border-primary/60 bg-gradient-to-b from-primary/10 via-background/90 to-background shadow-[0_18px_40px_-24px_rgba(15,23,42,0.7)]"
          : "border-border/70 bg-card/70 shadow-[0_16px_40px_-26px_rgba(15,23,42,0.9)]"
        }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -top-10 right-0 h-32 w-32 rounded-full bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.35),_transparent_60%)]" />
      </div>

      <CardHeader className="relative space-y-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="text-base font-semibold leading-tight sm:text-lg">
              {module.title}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground/90">
              {module.topic}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1 text-right text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-2 rounded-full border bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground shadow-sm">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[13px]">
                {statusInfo.icon}
              </span>
              <span>{statusInfo.label}</span>
            </div>
            <div className="inline-flex min-w-[120px] items-center justify-end gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-[11px]">
              <span className="text-muted-foreground/80">Уровень</span>
              <span className="font-semibold text-foreground">{module.level}</span>
            </div>
            {tasksCount !== undefined && (
              <div className="inline-flex min-w-[120px] items-center justify-end gap-1 rounded-full bg-muted/20 px-2 py-0.5 text-[11px]">
                <span className="text-muted-foreground/80">Заданий</span>
                <span className="font-medium text-foreground/90">{tasksCount}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground/90">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${statusInfo.tone}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-primary/60" />
            {statusInfo.label}
          </span>
          <span className="hidden sm:inline">
            {status === "not_started"
              ? "Самое время начать этот модуль."
              : status === "in_progress"
                ? "Продолжайте — до завершения осталось немного."
                : "Модуль успешно завершён."}
          </span>
        </div>
      </CardHeader>

      <CardContent className="relative flex flex-1 flex-col space-y-4 pt-0">
        {module.description && (
          <div className="text-xs sm:text-sm text-muted-foreground/90 line-clamp-3">
            {module.description}
          </div>
        )}
        <div className="mt-auto pt-1">
          <Button asChild className="w-full">
            <Link href={`/modules/${module.id}`}>
              {status === "not_started" ? "Начать изучение" : "Продолжить"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

