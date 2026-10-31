"use client";

import { CheckCircle2, Clock, Rocket } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/types/db";

type Module = Database["public"]["Tables"]["modules"]["Row"];

type ModuleStatus = "not_started" | "in_progress" | "completed";

interface ModuleCardProps {
  module: Module;
  status: ModuleStatus;
  tasksCount?: number;
}

const statusConfig: Record<ModuleStatus, { label: string; icon: typeof Clock; tone: string }> = {
  not_started: {
    label: "Не начат",
    icon: Clock,
    tone: "border-muted bg-muted/40 text-muted-foreground",
  },
  in_progress: {
    label: "В процессе",
    icon: Rocket,
    tone: "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  completed: {
    label: "Завершен",
    icon: CheckCircle2,
    tone: "border-emerald-500/60 bg-emerald-500/10 text-emerald-400",
  },
};

export function ModuleCard({ module, status, tasksCount }: ModuleCardProps) {
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;
  const isCompleted = status === "completed";

  return (
    <Card
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border transition-[border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-primary/40 ${
        isCompleted
          ? "border-emerald-500/60 bg-card/70 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.7)]"
          : "border-border/70 bg-card/70 shadow-[0_16px_40px_-26px_rgba(15,23,42,0.9)]"
      }`}
    >
      <CardHeader className="relative space-y-4 p-4 sm:p-5 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 pr-2">
            <CardTitle className="text-base font-semibold leading-tight sm:text-lg">
              {module.title}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground/90">
              {module.topic}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1.5 text-right text-xs text-muted-foreground shrink-0">
            <div className="inline-flex min-w-[110px] items-center justify-end gap-1.5 rounded-full bg-muted/40 px-2.5 py-1 text-xs whitespace-nowrap">
              <span className="text-muted-foreground/85">Уровень</span>
              <span className="font-semibold text-foreground">{module.level}</span>
            </div>
            {tasksCount !== undefined && (
              <div className="inline-flex min-w-[110px] items-center justify-end gap-1.5 rounded-full bg-muted/20 px-2.5 py-1 text-xs whitespace-nowrap">
                <span className="text-muted-foreground/85">Заданий</span>
                <span className="font-medium text-foreground/90">{tasksCount}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-3 border-t text-xs text-muted-foreground/90">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${statusInfo.tone}`}
          >
            <StatusIcon className="size-3.5 shrink-0" />
            <span>{statusInfo.label}</span>
          </span>
          <span className="truncate text-right font-medium text-muted-foreground/80 pl-2">
            {status === "not_started"
              ? "Самое время начать этот модуль."
              : status === "in_progress"
                ? "Продолжайте — до завершения осталось немного."
                : "Модуль успешно завершён."}
            </span>
        </div>
      </CardHeader>

      <CardContent className="relative flex flex-1 flex-col space-y-4 p-4 sm:p-5 pt-0">
        {module.description && (
          <div className="line-clamp-3 text-xs text-muted-foreground/90 sm:text-sm prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                p: ({ children }) => <span className="inline">{children}</span>,
                a: ({ children }) => <span className="text-primary underline">{children}</span>,
                code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">{children}</code>,
                pre: ({ children }) => <span className="block truncate">{children}</span>,
                ul: ({ children }) => <span className="inline">{children}</span>,
                ol: ({ children }) => <span className="inline">{children}</span>,
                li: ({ children }) => <span className="inline mr-2">• {children}</span>,
                h1: ({ children }) => <span className="font-semibold">{children}</span>,
                h2: ({ children }) => <span className="font-semibold">{children}</span>,
                h3: ({ children }) => <span className="font-semibold">{children}</span>,
                blockquote: ({ children }) => <span className="italic text-muted-foreground">{children}</span>,
                hr: () => <span className="mx-1 text-muted-foreground"> | </span>,
              }}
            >
              {module.description}
            </ReactMarkdown>
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
