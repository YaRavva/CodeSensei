"use client";

import {
  ArrowRight,
  Check,
  CheckCircle,
  ClipboardText,
  Clock,
  Lightbulb,
  Sparkle,
  SpinnerGap,
  Terminal,
  Warning,
  XCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import type { RefObject } from "react";
import { ProgramInput } from "@/components/editor/program-input";
import { TestResults } from "@/components/editor/test-results";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicTestCase } from "@/types/test-case";
import type { DockTab, TaskState } from "./types";
import { MIN_DOCK } from "./use-workshop-layout";

const TABS: { id: DockTab; label: string; short: string; Icon: typeof Terminal }[] = [
  { id: "output", label: "Вывод", short: "Вывод", Icon: Terminal },
  { id: "tests", label: "Проверка", short: "Тесты", Icon: ClipboardText },
  { id: "hint", label: "Подсказка", short: "Подсказка", Icon: Lightbulb },
  { id: "ai", label: "AI-оценка", short: "AI", Icon: Sparkle },
];

function EmptyState({
  Icon,
  title,
  hint,
  shortcut,
}: {
  Icon: typeof Terminal;
  title: string;
  hint: string;
  shortcut?: string;
}) {
  return (
    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-3 rounded-lg border p-6 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Icon size={24} />
      </span>
      <p className="title-3 text-foreground">{title}</p>
      <p className="max-w-[420px] caption-2 text-muted-foreground">{hint}</p>
      {shortcut && (
        <span className="rounded-md border bg-muted px-2 py-1 font-mono caption-5 text-muted-foreground">
          {shortcut}
        </span>
      )}
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 caption-2 text-muted-foreground">
        <SpinnerGap size={16} className="animate-spin text-primary" />
        {label}
      </div>
      <div className="space-y-2">
        <div className="h-3 w-3/4 animate-pulse rounded-md bg-foreground/10" />
        <div className="h-3 w-full animate-pulse rounded-md bg-foreground/10" />
        <div className="h-3 w-2/3 animate-pulse rounded-md bg-foreground/10" />
      </div>
    </div>
  );
}

interface ResultDockProps {
  tab: DockTab;
  onTab: (tab: DockTab) => void;
  state: TaskState | undefined;
  testCases: PublicTestCase[];
  height: number;
  maxHeight: number;
  bodyRef: RefObject<HTMLDivElement | null>;
  onGripDown: (event: React.PointerEvent<HTMLElement>) => void;
  onGripNudge: (delta: number) => void;
  hasNext: boolean;
  moduleDone: boolean;
  nextModule: { id: string; title: string } | null;
  onNext: () => void;
  onHint: () => void;
  taskId: string;
  programInput: string | null;
  onProgramInput: (value: string) => void;
  /** На мобильном «Результат» занимает всю рабочую область. */
  fill?: boolean;
}

export function ResultDock({
  tab,
  onTab,
  state,
  testCases,
  height,
  maxHeight,
  bodyRef,
  onGripDown,
  onGripNudge,
  hasNext,
  moduleDone,
  nextModule,
  onNext,
  onHint,
  taskId,
  programInput,
  onProgramInput,
  fill = false,
}: ResultDockProps) {
  const tests = state?.testResults ?? null;
  const passed = tests?.allPassed ?? false;

  const badge = (id: DockTab) => {
    if (id === "tests" && tests) {
      return {
        text: `${tests.passedCount}/${tests.totalCount}`,
        tone: passed
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-destructive/10 text-destructive",
      };
    }
    if (id === "hint" && state?.hintData) {
      return { text: "1", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400" };
    }
    if (id === "ai" && state?.feedbackData) {
      return {
        text: `${Math.round(state.feedbackData.score * 100)}%`,
        tone: "bg-primary/10 text-primary",
      };
    }
    return null;
  };

  const showFooter = Boolean(tests) || (moduleDone && nextModule);

  return (
    <div
      className={cn("flex min-h-0 flex-col bg-card", fill ? "flex-1" : "shrink-0 border-t")}
      style={fill ? undefined : { height: `${height}px` }}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: перетаскиваемая граница — это window splitter, а не <hr> */}
      <div
        role="separator"
        aria-orientation="horizontal"
        tabIndex={0}
        aria-label="Высота панели результатов"
        aria-valuenow={height}
        aria-valuemin={MIN_DOCK}
        aria-valuemax={Math.max(MIN_DOCK, maxHeight)}
        onPointerDown={onGripDown}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") {
            event.preventDefault();
            onGripNudge(16);
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            onGripNudge(-16);
          }
        }}
        className={cn(
          "group grid h-2 shrink-0 cursor-row-resize place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          fill && "hidden"
        )}
      >
        <span className="h-0.5 w-8 rounded-full bg-border transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-125 group-hover:bg-primary" />
      </div>

      <div
        role="tablist"
        aria-label="Результаты"
        className="flex shrink-0 gap-1 overflow-x-auto border-b bg-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:h-0"
      >
        {TABS.map(({ id, label, short, Icon }) => {
          const selected = tab === id;
          const mark = badge(id);
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onTab(id)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-sm px-3 button-sm transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={16} weight={selected ? "bold" : "regular"} className="hidden sm:block" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{short}</span>
              {mark && (
                <span className={cn("rounded-sm px-1.5 font-mono caption-5 leading-4", mark.tone)}>
                  {mark.text}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div ref={bodyRef} className="cs-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {tab === "output" && programInput !== null && (
          <ProgramInput
            id={`program-input-${taskId}`}
            value={programInput}
            onChange={onProgramInput}
          />
        )}

        {tab === "output" &&
          (state?.running ? (
            <Loading label="Выполняю программу…" />
          ) : state?.executionResult ? (
            state.executionResult.error ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="mb-2 flex items-center gap-2 body-4 text-destructive">
                  <XCircle size={16} weight="fill" />
                  Ошибка выполнения
                </p>
                <pre className="whitespace-pre-wrap break-words font-mono caption-5 text-destructive">
                  {state.executionResult.error}
                </pre>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="caption-4 text-muted-foreground">Вывод программы</span>
                  <span className="inline-flex items-center gap-1 caption-5 text-muted-foreground">
                    <Clock size={12} />
                    <span className="font-mono">{state.executionResult.executionTime} мс</span>
                  </span>
                </div>
                <pre className="overflow-x-auto rounded-lg border bg-background p-4 font-mono caption-5 text-foreground">
                  {state.executionResult.output || "(нет вывода)"}
                </pre>
              </div>
            )
          ) : (
            <EmptyState
              Icon={Terminal}
              title="Вывода пока нет"
              hint="Запустите программу, чтобы увидеть, что она печатает. Запуск не влияет на XP."
              shortcut="Ctrl + ↵"
            />
          ))}

        {tab === "tests" &&
          (state?.testing ? (
            <Loading label="Проверяю решение на тестах…" />
          ) : tests ? (
            <TestResults testResults={tests} testCases={testCases} />
          ) : (
            <EmptyState
              Icon={ClipboardText}
              title="Проверка не запускалась"
              hint="Нажмите «Проверить» — решение пройдёт видимые и скрытые тесты, как на сервере."
              shortcut="Ctrl + ⇧ + ↵"
            />
          ))}

        {tab === "hint" &&
          (state?.hintLoading ? (
            <Loading label="Думаю над подсказкой…" />
          ) : state?.hintData ? (
            <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/[0.04] p-4">
              <p className="flex items-center gap-2 body-4 text-foreground">
                <Lightbulb size={16} weight="fill" className="text-primary" />
                Подсказка
              </p>
              <p className="body-6 text-foreground">{state.hintData.hint}</p>
              {state.hintData.steps.length > 0 && (
                <div className="rounded-md border bg-background p-3">
                  <p className="mb-2 caption-4 text-muted-foreground">Шаги к решению</p>
                  <ol className="space-y-1.5">
                    {state.hintData.steps.map((step, index) => (
                      <li key={step} className="flex gap-2 caption-2">
                        <span className="shrink-0 font-mono font-medium text-primary">
                          {index + 1}.
                        </span>
                        <span className="text-muted-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-3 rounded-lg border p-6 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <Lightbulb size={24} />
              </span>
              <p className="title-3 text-foreground">Подсказка не запрашивалась</p>
              <p className="max-w-[420px] caption-2 text-muted-foreground">
                AI разберёт ваш код и даст шаги к решению — без готового ответа.
              </p>
              <Button variant="outline" size="sm" onClick={onHint}>
                <Lightbulb size={16} />
                Получить подсказку
              </Button>
            </div>
          ))}

        {tab === "ai" &&
          (state?.feedbackData ? (
            <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 body-4 text-foreground">
                  <CheckCircle
                    size={16}
                    weight="fill"
                    className="text-emerald-700 dark:text-emerald-400"
                  />
                  Разбор решения
                </p>
                <span className="shrink-0 font-mono title-3 text-emerald-700 dark:text-emerald-400">
                  {Math.round(state.feedbackData.score * 100)}%
                </span>
              </div>
              <p className="whitespace-pre-line body-6 text-muted-foreground">
                {state.feedbackData.feedback}
              </p>
            </div>
          ) : passed ? (
            <Loading label="AI разбирает решение…" />
          ) : (
            <EmptyState
              Icon={Sparkle}
              title="Разбор появится после проверки"
              hint="Как только все тесты пройдут, AI оценит решение и объяснит, что можно улучшить."
            />
          ))}
      </div>

      {showFooter && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-card p-3">
          {tests && !passed && (
            <>
              <Button variant="outline" onClick={onHint}>
                <Lightbulb size={16} />
                Получить подсказку
              </Button>
              <span className="caption-5 text-muted-foreground">Подсказка не снижает XP</span>
            </>
          )}
          {tests && passed && hasNext && (
            <>
              <Button onClick={onNext}>
                Следующее задание
                <ArrowRight size={16} weight="bold" />
              </Button>
              <span className="inline-flex items-center gap-1.5 caption-5 text-emerald-700 dark:text-emerald-400">
                <Check size={14} weight="bold" />
                Решение принято
              </span>
            </>
          )}
          {tests && passed && !hasNext && moduleDone && nextModule && (
            <>
              <Button asChild>
                <Link href={`/modules/${nextModule.id}`}>
                  Следующий модуль
                  <ArrowRight size={16} weight="bold" />
                </Link>
              </Button>
              <span className="caption-5 text-muted-foreground">Модуль пройден полностью</span>
            </>
          )}
          {tests && passed && !hasNext && !moduleDone && (
            <span className="inline-flex items-center gap-1.5 caption-4 text-muted-foreground">
              <Warning size={16} className="text-amber-600 dark:text-amber-400" />
              Остались нерешённые задания — выберите их в списке слева.
            </span>
          )}
          {!tests && moduleDone && nextModule && (
            <Button asChild variant="outline">
              <Link href={`/modules/${nextModule.id}`}>
                Следующий модуль
                <ArrowRight size={16} weight="bold" />
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
