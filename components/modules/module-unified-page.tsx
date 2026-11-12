"use client";

import {
  ArrowCounterClockwise,
  ArrowRight,
  CaretLeft,
  CaretRight,
  Check,
  FilePy,
  Lightbulb,
  List,
  Play,
  SpinnerGap,
  Star,
  Warning,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { CodeEditor } from "@/components/editor/code-editor";
import {
  defaultProgramInput,
  parseProgramInput,
  usesProgramInput,
} from "@/components/editor/program-input";
import { Markdown } from "@/components/modules/workshop/markdown";
import { ResultDock } from "@/components/modules/workshop/result-dock";
import { TaskRail } from "@/components/modules/workshop/task-rail";
import { TheoryView } from "@/components/modules/workshop/theory-view";
import type {
  DockTab,
  HintData,
  MobilePane,
  TaskState,
  TaskStatus,
  TaskWithStatus,
} from "@/components/modules/workshop/types";
import {
  MAX_SPLIT,
  MIN_SPLIT,
  useMediaQuery,
  useResizablePanes,
  useShellHeight,
} from "@/components/modules/workshop/use-workshop-layout";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { usePyodide } from "@/hooks/use-pyodide";
import { useToast } from "@/hooks/use-toast";
import { visibleTestCases } from "@/lib/security/public-tests";
import { cn } from "@/lib/utils";
import { buildPreviewCode, runTestSuite } from "@/lib/utils/test-runner";
import type { Module, Task, TaskAttempt } from "@/types/db";
import type { PublicTestCase, TestSuiteResult } from "@/types/test-case";

interface ModuleUnifiedPageProps {
  module: Module;
  tasks: Task[];
  completedTaskIds: string[];
  /** Прогресс с сервера; в UI считается вживую, чтобы полоса двигалась сразу после проверки. */
  moduleProgress: number;
  /** Next published module, shown when this one is completed. */
  nextModule?: { id: string; title: string } | null;
  userProgress?: {
    xpEarned: number;
    avgScore?: number;
    timeSpent?: number;
  };
}

const EASE = "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-sm border px-1 font-mono caption-5 text-muted-foreground">
      {children}
    </kbd>
  );
}

function ProgressRing({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 14;
  return (
    <span className="relative grid size-8 shrink-0 place-items-center">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" className="-rotate-90">
        <circle cx="16" cy="16" r="14" fill="none" stroke="var(--input)" strokeWidth="3" />
        <circle
          cx="16"
          cy="16"
          r="14"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          className="transition-[stroke-dashoffset] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        />
      </svg>
      <span className="absolute font-mono text-[9px] font-medium text-foreground">{value}</span>
    </span>
  );
}

function formatExample(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function ModuleUnifiedPage({
  module,
  tasks,
  completedTaskIds,
  userProgress,
  nextModule = null,
}: ModuleUnifiedPageProps) {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { pyodide, loading: pyodideLoading, error: pyodideError, executeCode } = usePyodide();

  const orderedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.order_index - b.order_index),
    [tasks]
  );

  const [activeId, setActiveId] = useState<string | null>(() => {
    const pending = orderedTasks.find((task) => !completedTaskIds.includes(task.id));
    return (pending ?? orderedTasks[0])?.id ?? null;
  });
  const [mode, setMode] = useState<"task" | "theory">("task");
  const [dockTab, setDockTab] = useState<DockTab>("output");
  const [mobilePane, setMobilePane] = useState<MobilePane>("code");
  const [railOpen, setRailOpen] = useState(false);
  // Text of the "program input" field per task (lines returned by input()).
  const [programInputs, setProgramInputs] = useState<Record<string, string>>({});
  const [taskStates, setTaskStates] = useState<Record<string, TaskState>>({});

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { ref: shellRef, height: shellHeight } = useShellHeight();
  const {
    workRef,
    dockBodyRef,
    split,
    dockHeight,
    dockMax,
    startSplit,
    nudgeSplit,
    startDock,
    nudgeDock,
    fitDock,
  } = useResizablePanes();

  // Дебаунс для кнопок проверки заданий (защита от спама) - Map по taskId
  const testTaskDebounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const taskIdsKey = tasks.map((task) => task.id).join(",");

  // Загружаем последние попытки для всех заданий
  // biome-ignore lint/correctness/useExhaustiveDependencies: перезагрузка только при смене набора заданий
  useEffect(() => {
    if (!user || tasks.length === 0) return;

    const loadAttempts = async () => {
      const taskIds = tasks.map((t) => t.id);

      const response = await fetch(
        `/api/tasks/attempts?taskIds=${encodeURIComponent(taskIds.join(","))}`,
        { credentials: "include", cache: "no-store" }
      );

      if (!response.ok) return;

      const { attempts } = (await response.json()) as { attempts: TaskAttempt[] };

      if (attempts) {
        // Группируем попытки по task_id, берем последнюю для каждого
        const attemptsByTask = new Map<string, TaskAttempt>();
        for (const attempt of attempts) {
          if (!attemptsByTask.has(attempt.task_id)) {
            attemptsByTask.set(attempt.task_id, attempt);
          }
        }

        // Инициализируем состояния заданий. Уже открытые задания сохраняют своё
        // состояние (код, результаты тестов, AI-оценку): router.refresh() после
        // начисления XP передаёт новые props, и сброс стирал результат проверки.
        setTaskStates((prev) => {
          const newTaskStates: Record<string, TaskState> = {};
          for (const task of tasks) {
            const lastAttempt = attemptsByTask.get(task.id) || null;
            const isCompleted = completedTaskIds.includes(task.id);
            const existing = prev[task.id];
            if (existing) {
              newTaskStates[task.id] = {
                ...existing,
                isCompleted:
                  existing.isCompleted || isCompleted || lastAttempt?.is_successful || false,
                lastAttempt: lastAttempt ?? existing.lastAttempt,
              };
              continue;
            }

            newTaskStates[task.id] = {
              code: (lastAttempt?.code_solution as string) || task.starter_code || "",
              initialCode: task.starter_code || "",
              executionResult: null,
              testResults: null,
              running: false,
              testing: false,
              isCompleted: isCompleted || lastAttempt?.is_successful || false,
              lastAttempt,
              hintLoading: false,
              hintData: null,
              feedbackData: null,
            };
          }

          return newTaskStates;
        });
      }
    };

    loadAttempts();
  }, [user?.id, taskIdsKey]);

  const tasksWithStatus: TaskWithStatus[] = useMemo(
    () =>
      orderedTasks.map((task) => {
        const state = taskStates[task.id];
        let status: TaskStatus = "not_started";
        if (completedTaskIds.includes(task.id) || state?.isCompleted) {
          status = "completed";
        } else if (state && (state.code !== state.initialCode || state.lastAttempt)) {
          status = "in_progress";
        }
        return { ...task, status, lastAttempt: state?.lastAttempt ?? null };
      }),
    [orderedTasks, taskStates, completedTaskIds]
  );

  const completedCount = tasksWithStatus.filter((task) => task.status === "completed").length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const moduleDone = tasks.length > 0 && completedCount === tasks.length;
  const nextTask = tasksWithStatus.find((task) => task.status !== "completed") ?? null;

  const activeTask = orderedTasks.find((task) => task.id === activeId) ?? null;
  const activeIndex = orderedTasks.findIndex((task) => task.id === activeId);
  const activeState = activeId ? taskStates[activeId] : undefined;
  const activeCode = activeState?.code ?? activeTask?.starter_code ?? "";
  const activeTestCases: PublicTestCase[] = useMemo(
    () => visibleTestCases(activeTask?.test_cases),
    [activeTask]
  );
  const initialInput = defaultProgramInput(activeTestCases);
  const programInput =
    activeTask && usesProgramInput(activeCode, initialInput)
      ? (programInputs[activeTask.id] ?? initialInput)
      : null;
  const example = activeTestCases.find(
    (testCase) => testCase.is_visible && testCase.expected_output !== undefined
  );

  // Время открытия обновляется при каждом показе задания — от него считается
  // время решения, которое уходит в попытку.
  useEffect(() => {
    if (!activeId || mode !== "task") return;
    localStorage.setItem(`task_open_time_${activeId}`, Date.now().toString());
  }, [activeId, mode]);

  const openTask = (taskId: string) => {
    setActiveId(taskId);
    setMode("task");
    setRailOpen(false);
    setDockTab(taskStates[taskId]?.testResults ? "tests" : "output");
    if (!isDesktop) setMobilePane("task");
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: openTask читает свежее состояние на вызове
  const stepTask = useCallback(
    (delta: number) => {
      if (orderedTasks.length === 0) return;
      const index = orderedTasks.findIndex((task) => task.id === activeId);
      const next = orderedTasks[Math.max(0, Math.min(orderedTasks.length - 1, index + delta))];
      if (next && next.id !== activeId) openTask(next.id);
    },
    [orderedTasks, activeId, isDesktop]
  );

  const handleRunCode = async (taskId: string) => {
    const state = taskStates[taskId];
    if (!state || !pyodide) return;

    if (pyodideError) {
      toast({
        title: "Ошибка Pyodide",
        description: "Не удалось загрузить Python среду. Попробуйте перезагрузить страницу.",
        variant: "destructive",
      });
      return;
    }

    if (!state.code.trim()) {
      toast({ title: "Ошибка", description: "Код не может быть пустым", variant: "destructive" });
      return;
    }

    setDockTab("output");
    setTaskStates((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], running: true, executionResult: null },
    }));

    try {
      const task = tasks.find((item) => item.id === taskId);
      const testCases: PublicTestCase[] = visibleTestCases(task?.test_cases);
      const result = await executeCode(
        buildPreviewCode(state.code, testCases[0], task?.task_type),
        10000,
        parseProgramInput(programInputs[taskId] ?? defaultProgramInput(testCases))
      );
      setTaskStates((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], running: false, executionResult: result },
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTaskStates((prev) => ({
        ...prev,
        [taskId]: {
          ...prev[taskId],
          running: false,
          executionResult: { output: "", error: errorMessage, executionTime: 0 },
        },
      }));
    }
  };

  const executeTestTask = async (taskId: string) => {
    const state = taskStates[taskId];
    if (!state || !pyodide) return;

    if (pyodideError) {
      toast({
        title: "Ошибка Pyodide",
        description: "Не удалось загрузить Python среду. Попробуйте перезагрузить страницу.",
        variant: "destructive",
      });
      return;
    }

    if (!state.code.trim()) {
      toast({ title: "Ошибка", description: "Код не может быть пустым", variant: "destructive" });
      return;
    }

    // КЛИЕНТСКАЯ ЗАЩИТА ОТ ЭКСПЛОИТА: предупреждаем о повторном решении.
    // Серверная проверка всё равно защитит, но это улучшает UX.
    if (state.isCompleted) {
      toast({
        title: "Задание уже выполнено",
        description:
          "Это задание уже было успешно выполнено. Вы можете улучшить решение, но XP не будет начислен повторно.",
        variant: "default",
        duration: 3000,
      });
    }

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const testCases: PublicTestCase[] = visibleTestCases(task.test_cases);

    // ЗАПРЕТ ФУНКЦИЙ В ЛИНЕЙНЫХ ЗАДАНИЯХ
    if (
      task.task_type !== "function" &&
      task.task_type !== "class" &&
      /\bdef\s+\w+\s*\(/.test(state.code)
    ) {
      const message =
        "В этом задании нельзя использовать функции (ключевое слово def). Используйте линейный код с input/print.";
      toast({ title: "Ошибка", description: message, variant: "destructive" });
      setTaskStates((prev) => ({
        ...prev,
        [taskId]: {
          ...prev[taskId],
          testResults: {
            results: testCases.map((tc) => ({
              testCaseId: tc.id,
              passed: false,
              error: message,
              executionTime: 0,
            })),
            passedCount: 0,
            totalCount: testCases.length,
            allPassed: false,
            executionTime: 0,
          },
        },
      }));
      return;
    }

    setTaskStates((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], testing: true, testResults: null },
    }));

    try {
      const results = await runTestSuite(state.code, testCases, pyodide, task.task_type);

      setTaskStates((prev) => ({
        ...prev,
        [taskId]: {
          ...prev[taskId],
          testing: false,
          testResults: results,
          isCompleted: results.allPassed,
        },
      }));

      if (!results.allPassed) return;

      // AI-оценка решения
      try {
        const evalRes = await fetch("/api/tasks/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId,
            code: state.code,
            runtimeOutput: state.executionResult?.output,
            testSummary: {
              allPassed: results.allPassed,
              passedCount: results.passedCount,
              total: results.totalCount,
            },
          }),
        });
        if (!evalRes.ok) {
          throw new Error(`HTTP error! status: ${evalRes.status}`);
        }
        const contentType = evalRes.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          throw new Error("Response is not JSON");
        }
        const evalJson = await evalRes.json();
        if (evalJson.success) {
          setTaskStates((prev) => ({
            ...prev,
            [taskId]: {
              ...prev[taskId],
              feedbackData: { score: evalJson.score, feedback: evalJson.feedback },
            },
          }));
          toast({
            title: "AI-оценка готова",
            description: `Решение оценено на ${Math.round(evalJson.score * 100)}%. Разбор — во вкладке «AI-оценка».`,
            duration: 4000,
          });
        }
      } catch {
        // ignore AI failure
      }

      // Сохраняем попытку и начисляем XP.
      // The server identifies the user by the session cookie; the client-side
      // auth state may still be loading and must not block saving the attempt.
      let solvingTimeMs: number | null = null;
      const openTimeStr = localStorage.getItem(`task_open_time_${taskId}`);
      if (openTimeStr) {
        solvingTimeMs = Date.now() - Number.parseInt(openTimeStr, 10);
        localStorage.removeItem(`task_open_time_${taskId}`);
      }

      const attemptResponse = await fetch("/api/tasks/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ taskId, code: state.code, solvingTimeMs, usedAiHint: false }),
      });

      if (!attemptResponse.ok) {
        const failure = (await attemptResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast({
          title: "Решение не сохранено",
          description:
            failure?.error ?? "Не удалось проверить решение на сервере. Повторите позже.",
          variant: "destructive",
        });
        return;
      }

      const attemptData = (await attemptResponse.json()) as {
        attemptNumber: number;
        isFirstSuccessfulAttempt: boolean;
        isSuccessful: boolean;
        testResults: TestSuiteResult;
      };

      // The server re-runs the tests; only its verdict counts.
      if (!attemptData.isSuccessful) {
        setTaskStates((prev) => ({
          ...prev,
          [taskId]: {
            ...prev[taskId],
            testResults: attemptData.testResults,
            isCompleted: state.isCompleted,
          },
        }));
        toast({
          title: "Решение не прошло проверку на сервере",
          description: "Посмотрите результаты тестов и исправьте решение.",
          variant: "destructive",
        });
        return;
      }

      const { attemptNumber, isFirstSuccessfulAttempt } = attemptData;

      // КЛИЕНТСКАЯ ЗАЩИТА ОТ ЭКСПЛОИТА: не начисляем XP повторно за решённое задание.
      // Серверная проверка всё равно защитит от обхода этой проверки.
      if (!state.isCompleted || isFirstSuccessfulAttempt) {
        const xpResponse = await fetch("/api/tasks/award-xp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId,
            lessonId: "legacy",
            attemptNumber,
            usedAiHint: false,
            executionTime: results.executionTime,
            isFirstAttempt: isFirstSuccessfulAttempt,
          }),
        });

        if (!xpResponse.ok) {
          throw new Error(`HTTP error! status: ${xpResponse.status}`);
        }
        const contentType = xpResponse.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          throw new Error("Response is not JSON");
        }
        const xpData = await xpResponse.json();

        if (xpData.success) {
          if (xpData.alreadyCompleted) {
            toast({
              title: "Все тесты пройдены",
              description:
                xpData.message ||
                "Задание уже было успешно выполнено ранее. XP не начисляется повторно.",
              variant: "default",
              duration: 3000,
            });
          } else if (xpData.xpAwarded > 0) {
            toast({
              title: "Задание решено",
              description: `Все тесты пройдены. Вы заработали ${xpData.xpAwarded} XP${xpData.newLevel !== undefined && xpData.newLevel !== null ? ` (Уровень ${xpData.newLevel})` : ""}`,
              duration: 5000,
            });

            for (const achievement of xpData.newlyUnlockedAchievements ?? []) {
              setTimeout(() => {
                toast({
                  title: "Достижение разблокировано",
                  description: `${achievement.title}: ${achievement.description} (+${achievement.xp_reward} XP)`,
                  duration: 7000,
                });
              }, 600);
            }

            // Обновляем XP в шапке/профиле и серверные данные страницы
            refreshProfile?.().catch(() => {});
            router.refresh();
          } else {
            toast({
              title: "Все тесты пройдены",
              description: "Задание выполнено",
              variant: "default",
              duration: 3000,
            });
          }
          setTaskStates((prev) => ({
            ...prev,
            [taskId]: { ...prev[taskId], isCompleted: true },
          }));
        }
      } else {
        toast({
          title: "Все тесты пройдены",
          description: "Задание уже было успешно выполнено ранее. Попытка сохранена в историю.",
          variant: "default",
          duration: 3000,
        });
        setTaskStates((prev) => ({
          ...prev,
          [taskId]: { ...prev[taskId], isCompleted: true },
        }));
      }
    } catch (error) {
      toast({
        title: "Ошибка выполнения тестов",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
      setTaskStates((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], testing: false },
      }));
    }
  };

  const handleTestTask = (taskId: string) => {
    const state = taskStates[taskId];
    if (!state || !pyodide) return;

    // КЛИЕНТСКАЯ ЗАЩИТА ОТ ЭКСПЛОИТА: повторные вызовы во время проверки игнорируем
    if (state.testing) return;

    setDockTab("tests");

    // Дебаунс 500мс: повторное нажатие отменяет предыдущий запуск
    const existingTimeout = testTaskDebounceRefs.current.get(taskId);
    if (existingTimeout) clearTimeout(existingTimeout);

    const timeoutId = setTimeout(() => {
      testTaskDebounceRefs.current.delete(taskId);
      executeTestTask(taskId);
    }, 500);
    testTaskDebounceRefs.current.set(taskId, timeoutId);
  };

  const handleResetCode = (taskId: string) => {
    setTaskStates((prev) => {
      const state = prev[taskId];
      if (!state) return prev;
      return {
        ...prev,
        [taskId]: {
          ...state,
          code: state.initialCode,
          executionResult: null,
          testResults: null,
        },
      };
    });
  };

  const handleAiHint = async (taskId: string) => {
    setDockTab("hint");
    const state = taskStates[taskId];
    if (!state || state.hintLoading || state.hintData) return;

    setTaskStates((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], hintLoading: true },
    }));

    try {
      const res = await fetch("/api/ai/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, code: state.code }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("Response is not JSON");
      }
      const data = await res.json();
      const hint = data?.hint;

      const hintData: HintData = {
        type: hint?.type || "hint",
        hint: hint?.hint || "Попробуйте ещё раз",
        steps: Array.isArray(hint?.steps) ? hint.steps : [],
      };

      setTaskStates((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], hintLoading: false, hintData },
      }));
    } catch (e) {
      toast({
        title: "Ошибка подсказки",
        description: e instanceof Error ? e.message : "Неизвестная ошибка",
        variant: "destructive",
      });
      setTaskStates((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], hintLoading: false },
      }));
    }
  };

  const handleCodeChange = (taskId: string, value: string | undefined) => {
    setTaskStates((prev) => {
      const currentState = prev[taskId];
      const task = tasks.find((t) => t.id === taskId);
      const newCode = value ?? "";
      if (!currentState && task) {
        return {
          ...prev,
          [taskId]: {
            code: newCode,
            initialCode: task.starter_code || "",
            executionResult: null,
            testResults: null,
            running: false,
            testing: false,
            isCompleted: false,
            lastAttempt: null,
            hintLoading: false,
            hintData: null,
            feedbackData: null,
          },
        };
      }
      return { ...prev, [taskId]: { ...currentState, code: newCode } };
    });
  };

  // Док подстраивается под содержимое, пока высоту не задали вручную.
  // biome-ignore lint/correctness/useExhaustiveDependencies: пересчёт нужен на каждое новое содержимое дока
  useEffect(() => {
    const frame = requestAnimationFrame(fitDock);
    return () => cancelAnimationFrame(frame);
  }, [
    fitDock,
    dockTab,
    activeId,
    activeState?.executionResult,
    activeState?.testResults,
    activeState?.hintData,
    activeState?.feedbackData,
  ]);

  // Monaco вешает свои биндинги на DOM редактора и глушит всплытие, поэтому
  // горячие клавиши слушаются в фазе перехвата — до того, как их увидит редактор.
  const shortcutsRef = useRef<{
    run: () => void;
    check: () => void;
    step: (delta: number) => void;
    enabled: boolean;
  } | null>(null);

  useEffect(() => {
    shortcutsRef.current = {
      run: () => {
        if (activeId) handleRunCode(activeId);
      },
      check: () => {
        if (activeId) handleTestTask(activeId);
      },
      step: stepTask,
      enabled: mode === "task" && Boolean(activeId),
    };
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const actions = shortcutsRef.current;
      if (!actions) return;
      const take = () => {
        event.preventDefault();
        event.stopPropagation();
      };
      if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        take();
        actions.step(event.key === "ArrowLeft" ? -1 : 1);
        return;
      }
      if (!actions.enabled || !(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
      take();
      if (event.shiftKey) actions.check();
      else actions.run();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  useEffect(() => {
    if (!railOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRailOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [railOpen]);

  const runDisabled =
    activeState?.running || pyodideLoading || Boolean(pyodideError) || !activeCode.trim();
  const testDisabled =
    activeState?.testing || pyodideLoading || Boolean(pyodideError) || !activeCode.trim();
  const resetDisabled = activeCode === (activeState?.initialCode ?? activeTask?.starter_code ?? "");
  const showEditor = isDesktop || mobilePane === "code";
  const showDock = isDesktop || mobilePane === "result";
  const showStatement = isDesktop || mobilePane === "task";

  if (!activeTask) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center">
          <h1 className="heading-5 text-foreground">{module.title}</h1>
          <p className="mt-3 body-6 text-muted-foreground">
            В этом модуле пока нет опубликованных заданий. Загляните позже.
          </p>
          <Button asChild className="mt-6">
            <a href="/modules">К списку модулей</a>
          </Button>
        </div>
      </div>
    );
  }

  const rail = (
    <TaskRail
      level={module.level}
      moduleId={module.id}
      title={module.title}
      topic={module.topic}
      tasks={tasksWithStatus}
      activeId={activeId}
      mode={mode}
      hasTheory={Boolean(module.description)}
      completedCount={completedCount}
      progress={progress}
      xpEarned={userProgress?.xpEarned ?? 0}
      nextModule={nextModule}
      onSelect={openTask}
      onTheory={() => {
        setMode("theory");
        setRailOpen(false);
      }}
      onClose={() => setRailOpen(false)}
    />
  );

  return (
    <div className="px-3 pt-3 md:px-4 md:pt-4">
      <div
        ref={shellRef}
        style={{ height: shellHeight ? `${shellHeight}px` : "calc(100vh - 160px)" }}
        className="grid min-h-[560px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border bg-card"
      >
        <div className="flex h-12 shrink-0 items-center gap-2 border-b bg-card px-2 lg:hidden">
          <button
            type="button"
            onClick={() => setRailOpen(true)}
            aria-label="Список заданий"
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              EASE
            )}
          >
            <List size={20} />
          </button>
          <span className="min-w-0 flex-1 truncate body-4 text-foreground">
            {mode === "theory" ? "Теория модуля" : activeTask.title}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono caption-5 text-amber-700 dark:text-amber-400">
            <Star size={12} weight="fill" />
            {userProgress?.xpEarned ?? 0}
          </span>
          <ProgressRing value={progress} />
        </div>

        <div className="relative grid min-h-0 min-w-0 grid-cols-1 overflow-hidden lg:grid-cols-[288px_minmax(0,1fr)]">
          <aside className="hidden min-h-0 border-r lg:block">{rail}</aside>

          {!isDesktop && (
            <>
              <button
                type="button"
                tabIndex={railOpen ? 0 : -1}
                aria-label="Закрыть список заданий"
                aria-hidden={!railOpen}
                onClick={() => setRailOpen(false)}
                className={cn(
                  "absolute inset-0 z-20 bg-black/60 transition-opacity duration-300",
                  railOpen ? "opacity-100" : "pointer-events-none opacity-0"
                )}
              />
              <aside
                aria-hidden={!railOpen}
                className={cn(
                  "absolute inset-y-0 left-0 z-30 w-[288px] max-w-[85vw] border-r shadow-xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  railOpen ? "translate-x-0" : "-translate-x-[101%]"
                )}
              >
                {rail}
              </aside>
            </>
          )}

          <div ref={workRef} className="relative min-h-0 min-w-0 bg-background">
            {mode === "theory" && module.description ? (
              <TheoryView
                level={module.level}
                title={module.title}
                topic={module.topic}
                description={module.description}
                allDone={moduleDone}
                avgScore={userProgress?.avgScore}
                timeSpent={userProgress?.timeSpent}
                startLabel={
                  moduleDone
                    ? "Вернуться к заданиям"
                    : completedCount === 0
                      ? "Начать первое задание"
                      : `Продолжить с задания ${nextTask?.order_index ?? 1}`
                }
                onStart={() => openTask(nextTask?.id ?? orderedTasks[0].id)}
              />
            ) : (
              <div
                className="grid h-full min-h-0 grid-cols-1"
                style={
                  isDesktop
                    ? { gridTemplateColumns: `${split}% 4px minmax(0,1fr)` }
                    : { gridTemplateRows: "auto minmax(0,1fr)" }
                }
              >
                {!isDesktop && (
                  <div
                    role="tablist"
                    aria-label="Раздел задания"
                    className="flex shrink-0 gap-1 border-b bg-muted p-1"
                  >
                    {(
                      [
                        ["task", "Задание"],
                        ["code", "Код"],
                        ["result", "Результат"],
                      ] as [MobilePane, string][]
                    ).map(([pane, label]) => (
                      <button
                        key={pane}
                        type="button"
                        role="tab"
                        aria-selected={mobilePane === pane}
                        onClick={() => setMobilePane(pane)}
                        className={cn(
                          "h-9 flex-1 rounded-sm button-sm transition-colors",
                          EASE,
                          mobilePane === pane
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                <section
                  className={cn(
                    "flex min-h-0 min-w-0 flex-col overflow-hidden bg-card",
                    !showStatement && "hidden"
                  )}
                >
                  <div className="shrink-0 border-b p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="caption-3 uppercase tracking-wider text-muted-foreground">
                        Задание {activeIndex + 1} из {orderedTasks.length}
                      </span>
                      <DifficultyBadge difficulty={activeTask.difficulty} />
                      <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 font-mono caption-4 text-primary">
                        +{activeTask.xp_reward} XP
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <h2 className="min-w-0 flex-1 title-1 text-foreground">{activeTask.title}</h2>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => stepTask(-1)}
                          disabled={activeIndex <= 0}
                          aria-label="Предыдущее задание"
                          className={cn(
                            "grid size-8 place-items-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                            EASE
                          )}
                        >
                          <CaretLeft size={16} weight="bold" />
                        </button>
                        <button
                          type="button"
                          onClick={() => stepTask(1)}
                          disabled={activeIndex >= orderedTasks.length - 1}
                          aria-label="Следующее задание"
                          className={cn(
                            "grid size-8 place-items-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                            EASE
                          )}
                        >
                          <CaretRight size={16} weight="bold" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="cs-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 pb-6">
                    <Markdown key={activeTask.id} source={activeTask.description} />

                    {example && (
                      <div className="mt-5 rounded-xl border bg-background p-4">
                        <p className="caption-3 uppercase tracking-wider text-muted-foreground">
                          Пример · {example.description}
                        </p>
                        {example.stdin && example.stdin.length > 0 && (
                          <div className="mt-3">
                            <p className="caption-5 text-muted-foreground">Ввод</p>
                            <pre className="mt-1 overflow-x-auto rounded-lg border bg-muted p-3 font-mono caption-5 text-foreground">
                              {example.stdin.join("\n")}
                            </pre>
                          </div>
                        )}
                        <div className="mt-3">
                          <p className="caption-5 text-muted-foreground">Ожидаемый вывод</p>
                          <pre className="mt-1 overflow-x-auto rounded-lg border bg-muted p-3 font-mono caption-5 text-foreground">
                            {formatExample(example.expected_output)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isDesktop && (
                    <div className="shrink-0 border-t p-3">
                      <Button className="w-full" onClick={() => setMobilePane("code")}>
                        Перейти к коду
                        <ArrowRight size={16} weight="bold" />
                      </Button>
                    </div>
                  )}
                </section>

                {isDesktop && (
                  // biome-ignore lint/a11y/useSemanticElements: перетаскиваемая граница — это window splitter, а не <hr>
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    tabIndex={0}
                    aria-label="Ширина колонок"
                    aria-valuenow={Math.round(split)}
                    aria-valuemin={MIN_SPLIT}
                    aria-valuemax={MAX_SPLIT}
                    onPointerDown={startSplit}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowLeft") {
                        event.preventDefault();
                        nudgeSplit(-2);
                      } else if (event.key === "ArrowRight") {
                        event.preventDefault();
                        nudgeSplit(2);
                      }
                    }}
                    className={cn(
                      "relative cursor-col-resize bg-border transition-colors after:absolute after:inset-y-0 after:-inset-x-1 hover:bg-primary focus-visible:bg-primary focus-visible:outline-none",
                      EASE
                    )}
                  />
                )}

                <div
                  className={cn(
                    "flex min-h-0 min-w-0 flex-col bg-card",
                    !showEditor && !showDock && "hidden"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 shrink-0 items-center gap-2 border-b px-3",
                      !showEditor && "hidden"
                    )}
                  >
                    <span className="inline-flex items-center gap-2 font-mono caption-4 text-foreground">
                      <FilePy size={16} weight="duotone" className="text-primary" />
                      main.py
                    </span>
                    <span className="hidden rounded-full border px-2 caption-5 text-muted-foreground sm:inline">
                      Python 3.14
                    </span>
                    <button
                      type="button"
                      onClick={() => activeId && handleResetCode(activeId)}
                      disabled={resetDisabled}
                      className={cn(
                        "ml-auto inline-flex h-8 items-center gap-2 rounded-md px-3 button-xsm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                        EASE
                      )}
                    >
                      <ArrowCounterClockwise size={16} />
                      Сбросить
                    </button>
                  </div>

                  <div className={cn("min-h-0 flex-1", !showEditor && "hidden")}>
                    <CodeEditor
                      value={activeCode}
                      onChange={(value) => activeId && handleCodeChange(activeId, value)}
                      height="100%"
                      language="python"
                      path={`unified-task-${activeTask.id}`}
                      className="rounded-none! border-0!"
                    />
                  </div>

                  {pyodideError && (
                    <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-destructive/40 bg-destructive/10 px-3 py-2">
                      <Warning size={16} weight="fill" className="text-destructive" />
                      <span className="min-w-0 flex-1 caption-5 text-destructive">
                        Python не загрузился: {pyodideError.message}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                        Перезагрузить
                      </Button>
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex shrink-0 flex-wrap items-center gap-2 border-t bg-card p-2",
                      !showEditor && "hidden"
                    )}
                  >
                    <Button
                      variant="outline"
                      onClick={() => activeId && handleRunCode(activeId)}
                      disabled={runDisabled}
                      className="flex-1 sm:flex-none"
                    >
                      {activeState?.running ? (
                        <SpinnerGap size={16} className="animate-spin" />
                      ) : (
                        <Play size={16} weight="fill" />
                      )}
                      Запустить
                      <span className="hidden font-mono caption-5 opacity-60 xl:inline">⌃↵</span>
                    </Button>
                    <Button
                      onClick={() => activeId && handleTestTask(activeId)}
                      disabled={testDisabled}
                      className="flex-1 sm:flex-none"
                    >
                      {activeState?.testing ? (
                        <SpinnerGap size={16} className="animate-spin" />
                      ) : (
                        <Check size={16} weight="bold" />
                      )}
                      Проверить
                      <span className="hidden font-mono caption-5 opacity-70 xl:inline">⌃⇧↵</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => activeId && handleAiHint(activeId)}
                      disabled={activeState?.hintLoading}
                      className="flex-1 sm:flex-none"
                    >
                      <Lightbulb size={16} />
                      Подсказка
                    </Button>
                    <span className="ml-auto hidden caption-5 text-muted-foreground xl:inline">
                      {pyodideLoading
                        ? "Загрузка Python…"
                        : activeState?.testing
                          ? "Проверка…"
                          : activeState?.running
                            ? "Выполнение…"
                            : "готов"}
                    </span>
                  </div>

                  {showDock && activeId && (
                    <ResultDock
                      tab={dockTab}
                      onTab={setDockTab}
                      state={activeState}
                      testCases={activeTestCases}
                      height={dockHeight}
                      maxHeight={dockMax}
                      bodyRef={dockBodyRef}
                      onGripDown={startDock}
                      onGripNudge={nudgeDock}
                      hasNext={activeIndex < orderedTasks.length - 1}
                      moduleDone={moduleDone}
                      nextModule={nextModule}
                      onNext={() => stepTask(1)}
                      onHint={() => handleAiHint(activeId)}
                      taskId={activeId}
                      programInput={programInput}
                      onProgramInput={(value) =>
                        setProgramInputs((prev) => ({ ...prev, [activeId]: value }))
                      }
                      fill={!isDesktop}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex h-8 shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap border-t bg-card px-3 caption-5 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 rounded-full",
                pyodideError
                  ? "bg-destructive"
                  : pyodideLoading
                    ? "bg-amber-500"
                    : "bg-success ring-3 ring-success/20"
              )}
            />
            {pyodideError
              ? "Python не загрузился"
              : pyodideLoading
                ? "Загрузка Python…"
                : "Pyodide · Python 3.14"}
          </span>
          {mode === "task" && (
            <span className="mx-auto hidden items-center gap-3 lg:flex">
              <span className="flex items-center gap-1">
                <Kbd>Ctrl</Kbd>+<Kbd>↵</Kbd> запустить
              </span>
              <span className="flex items-center gap-1">
                <Kbd>Ctrl</Kbd>+<Kbd>⇧</Kbd>+<Kbd>↵</Kbd> проверить
              </span>
              <span className="flex items-center gap-1">
                <Kbd>Alt</Kbd>+<Kbd>←→</Kbd> задание
              </span>
            </span>
          )}
          <span className="ml-auto font-mono text-primary lg:ml-0">
            {completedCount} / {tasks.length}
          </span>
        </div>
      </div>
    </div>
  );
}
