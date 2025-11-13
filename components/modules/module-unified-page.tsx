"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { Database } from "@/types/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CodeEditor } from "@/components/editor/code-editor";
import { TestResults } from "@/components/editor/test-results";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { runTestSuite } from "@/lib/utils/test-runner";
import { usePyodide } from "@/hooks/use-pyodide";
import type { TestCase, TestSuiteResult } from "@/types/test-case";
import { 
  BookOpen, 
  RotateCcw, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  ArrowUpDown,
  TrendingUp,
  Clock,
  Award,
  List
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Module = Database["public"]["Tables"]["modules"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];
type TaskAttempt = Database["public"]["Tables"]["task_attempts"]["Row"];

interface ModuleUnifiedPageProps {
  module: Module;
  tasks: Task[];
  completedTaskIds: string[];
  moduleProgress: number;
  userProgress?: {
    xpEarned: number;
    avgScore?: number;
    timeSpent?: number;
  };
}

type TaskStatus = "not_started" | "in_progress" | "completed";
type FilterStatus = "all" | "completed" | "in_progress" | "not_started";
type SortOption = "order" | "status" | "difficulty";

interface TaskWithStatus extends Task {
  status: TaskStatus;
  lastAttempt: TaskAttempt | null;
}

export function ModuleUnifiedPage({ 
  module, 
  tasks, 
  completedTaskIds, 
  moduleProgress,
  userProgress 
}: ModuleUnifiedPageProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Состояние для открытых accordion items (для навигации)
  const [openItems, setOpenItems] = useState<string[]>([]);

  // Отслеживаем время открытия заданий в аккордеоне
  // Время открытия обновляется при каждом открытии (если пользователь закрыл и открыл снова)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    openItems.forEach((taskId) => {
      const openTimeKey = `task_open_time_${taskId}`;
      // Обновляем время открытия каждый раз, когда задание открывается
      // Это позволяет считать время с момента последнего открытия
      localStorage.setItem(openTimeKey, Date.now().toString());
    });
  }, [openItems]);
  const { toast } = useToast();
  const { pyodide, loading: pyodideLoading, error: pyodideError, executeCode } = usePyodide();
  
  // Состояния фильтров и сортировки
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortOption, setSortOption] = useState<SortOption>("order");
  
  // Состояния для каждого задания (код, результаты и т.д.)
  const [taskStates, setTaskStates] = useState<Record<string, {
    code: string;
    initialCode: string;
    executionResult: { output: string; error: string | null; executionTime: number } | null;
    testResults: TestSuiteResult | null;
    running: boolean;
    testing: boolean;
    isCompleted: boolean;
    lastAttempt: TaskAttempt | null;
  }>>({});
  
  // Дебаунс для кнопок проверки заданий (защита от спама) - Map по taskId
  const testTaskDebounceRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Состояние AI-подсказки
  const [hintOpen, setHintOpen] = useState(false);
  const [hintTitle, setHintTitle] = useState<string>("");
  const [hintMarkdown, setHintMarkdown] = useState<string>("");
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  
  // Состояние AI-оценки
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState<string>("");
  const [feedbackMarkdown, setFeedbackMarkdown] = useState<string>("");

  // Загружаем последние попытки для всех заданий
  useEffect(() => {
    if (!user || tasks.length === 0) return;
    
    const loadAttempts = async () => {
      const supabase = createClient();
      const taskIds = tasks.map(t => t.id);
      
      const { data: attempts } = await supabase
        .from("task_attempts")
        .select("*")
        .eq("user_id", user.id)
        .in("task_id", taskIds)
        .order("created_at", { ascending: false });
      
      if (attempts) {
        // Группируем попытки по task_id, берем последнюю для каждого
        const typedAttempts = attempts as TaskAttempt[];
        const attemptsByTask = new Map<string, TaskAttempt>();
        for (const attempt of typedAttempts) {
          if (!attemptsByTask.has(attempt.task_id)) {
            attemptsByTask.set(attempt.task_id, attempt);
          }
        }
        
        // Инициализируем состояния заданий
        const newTaskStates: typeof taskStates = {};
        for (const task of tasks) {
          const lastAttempt = attemptsByTask.get(task.id) || null;
          const isCompleted = completedTaskIds.includes(task.id);
          
          newTaskStates[task.id] = {
            code: (lastAttempt?.code_solution as string) || task.starter_code || "",
            initialCode: task.starter_code || "",
            executionResult: null,
            testResults: null,
            running: false,
            testing: false,
            isCompleted: isCompleted || (lastAttempt?.is_successful || false),
            lastAttempt,
          };
        }
        
        setTaskStates(newTaskStates);
      }
    };
    
    loadAttempts();
  }, [user, tasks, completedTaskIds]);

  // Определяем статус задания
  const getTaskStatus = (taskId: string): TaskStatus => {
    const state = taskStates[taskId];
    // Проверяем isCompleted из состояния (обновляется после успешного выполнения)
    if (completedTaskIds.includes(taskId) || state?.isCompleted) return "completed";
    if (state && (state.code !== state.initialCode || state.lastAttempt)) return "in_progress";
    return "not_started";
  };

  // Получаем задания с статусами
  const tasksWithStatus: TaskWithStatus[] = useMemo(() => {
    return tasks.map(task => ({
      ...task,
      status: getTaskStatus(task.id),
      lastAttempt: taskStates[task.id]?.lastAttempt || null,
    }));
  }, [tasks, taskStates, completedTaskIds]);

  // Фильтруем задания
  const filteredTasks = useMemo(() => {
    let filtered = tasksWithStatus;
    
    if (filterStatus !== "all") {
      filtered = filtered.filter(task => task.status === filterStatus);
    }
    
    return filtered;
  }, [tasksWithStatus, filterStatus]);

  // Сортируем задания
  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasks];
    
    switch (sortOption) {
      case "order":
        return sorted.sort((a, b) => a.order_index - b.order_index);
      case "status":
        const statusOrder: Record<TaskStatus, number> = {
          not_started: 0,
          in_progress: 1,
          completed: 2,
        };
        return sorted.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      case "difficulty":
        const difficultyOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
        return sorted.sort((a, b) => (difficultyOrder[a.difficulty] || 0) - (difficultyOrder[b.difficulty] || 0));
      default:
        return sorted;
    }
  }, [filteredTasks, sortOption]);

  // Обработчики для заданий
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
      toast({
        title: "Ошибка",
        description: "Код не может быть пустым",
        variant: "destructive",
      });
      return;
    }

    setTaskStates(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], running: true, executionResult: null },
    }));

    try {
      const result = await executeCode(state.code, 10000);
      setTaskStates(prev => ({
        ...prev,
        [taskId]: { ...prev[taskId], running: false, executionResult: result },
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTaskStates(prev => ({
        ...prev,
        [taskId]: {
          ...prev[taskId],
          running: false,
          executionResult: {
            output: "",
            error: errorMessage,
            executionTime: 0,
          },
        },
      }));
    }
  };

  const handleTestTask = async (taskId: string) => {
    const state = taskStates[taskId];
    if (!state || !pyodide) return;
    
    // КЛИЕНТСКАЯ ЗАЩИТА ОТ ЭКСПЛОИТА: Проверяем, не выполняется ли уже проверка
    if (state.testing) {
      return; // Игнорируем повторные вызовы во время обработки
    }

    // Дебаунс: отменяем предыдущий таймер для этого задания, если он был установлен
    const existingTimeout = testTaskDebounceRefs.current.get(taskId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Устанавливаем новый таймер для дебаунса (500мс)
    // Если кнопка будет нажата повторно в течение 500мс, предыдущий вызов будет отменен
    const timeoutId = setTimeout(async () => {
      testTaskDebounceRefs.current.delete(taskId);
      await executeTestTask(taskId);
    }, 500);
    testTaskDebounceRefs.current.set(taskId, timeoutId);
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
      toast({
        title: "Ошибка",
        description: "Код не может быть пустым",
        variant: "destructive",
      });
      return;
    }

    // КЛИЕНТСКАЯ ЗАЩИТА ОТ ЭКСПЛОИТА: Если задание уже выполнено, показываем сообщение
    // Серверная проверка всё равно защитит, но это улучшает UX
    if (state.isCompleted) {
      toast({
        title: "Задание уже выполнено",
        description: "Это задание уже было успешно выполнено. Вы можете улучшить решение, но XP не будет начислен повторно.",
        variant: "default",
        duration: 3000,
      });
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const testCases: TestCase[] = Array.isArray(task.test_cases)
      ? (task.test_cases as unknown as TestCase[])
      : [];

    setTaskStates(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], testing: true, testResults: null },
    }));

    try {
      const results = await runTestSuite(state.code, testCases, pyodide);
      
      setTaskStates(prev => ({
        ...prev,
        [taskId]: { 
          ...prev[taskId], 
          testing: false, 
          testResults: results,
          isCompleted: results.allPassed,
        },
      }));

      if (results.allPassed) {
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
                total: results.totalCount 
              },
            }),
          });
          if (!evalRes.ok) {
            throw new Error(`HTTP error! status: ${evalRes.status}`);
          }
          const contentType = evalRes.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Response is not JSON");
          }
          const evalJson = await evalRes.json();
          if (evalRes.ok && evalJson.success) {
            setFeedbackTitle(`AI-оценка: ${(evalJson.score * 100).toFixed(0)}%`);
            setFeedbackMarkdown(evalJson.feedback);
            setFeedbackOpen(true);
          }
        } catch {
          // ignore AI failure
        }

        // Сохраняем попытку и начисляем XP
        if (user) {
          const supabase = createClient();
          
          const { count: attemptsCount } = await supabase
            .from("task_attempts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("task_id", taskId);

          const attemptNumber = (attemptsCount || 0) + 1;

          const { data: successfulAttempts } = await supabase
            .from("task_attempts")
            .select("id")
            .eq("user_id", user.id)
            .eq("task_id", taskId)
            .eq("is_successful", true);

          const isFirstSuccessfulAttempt = results.allPassed && (!successfulAttempts || successfulAttempts.length === 0);

          // Вычисляем время решения (от открытия до проверки)
          let solvingTimeMs: number | null = null;
          if (typeof window !== "undefined") {
            const openTimeKey = `task_open_time_${taskId}`;
            const openTimeStr = localStorage.getItem(openTimeKey);
            if (openTimeStr) {
              const openTime = parseInt(openTimeStr, 10);
              const currentTime = Date.now();
              solvingTimeMs = currentTime - openTime;
              // Удаляем время открытия после использования
              localStorage.removeItem(openTimeKey);
            }
          }

          await (supabase.from("task_attempts") as any).insert({
            user_id: user.id,
            task_id: taskId,
            code_solution: state.code,
            test_results: results as any,
            is_successful: results.allPassed,
            execution_time_ms: results.executionTime,
            solving_time_ms: solvingTimeMs,
            error_message: results.results.find((r) => !r.passed)?.error ?? null,
            used_ai_hint: false,
          });

          // КЛИЕНТСКАЯ ЗАЩИТА ОТ ЭКСПЛОИТА: Не вызываем API начисления XP, если задание уже было выполнено
          // Это уменьшает нагрузку на сервер и улучшает UX
          // Серверная проверка всё равно защитит от обхода этой проверки
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
            if (!contentType || !contentType.includes("application/json")) {
              throw new Error("Response is not JSON");
            }
            const xpData = await xpResponse.json();

            if (xpResponse.ok && xpData.success) {
              // Обрабатываем ответ от сервера
              if (xpData.alreadyCompleted) {
                // Сервер вернул, что задание уже было выполнено
                toast({
                  title: "Все тесты пройдены! ✅",
                  description: xpData.message || "Задание уже было успешно выполнено ранее. XP не начисляется повторно.",
                  variant: "default",
                  duration: 3000,
                });
                setTaskStates(prev => ({
                  ...prev,
                  [taskId]: { ...prev[taskId], isCompleted: true },
                }));
              } else if (xpData.xpAwarded > 0) {
                // XP был начислен
                toast({
                  title: "Поздравляем! 🎉",
                  description: `Все тесты пройдены! Вы заработали ${xpData.xpAwarded} XP${xpData.newLevel !== undefined && xpData.newLevel !== null ? ` (Уровень ${xpData.newLevel})` : ""}`,
                  duration: 5000,
                });

                if (xpData.newlyUnlockedAchievements && xpData.newlyUnlockedAchievements.length > 0) {
                  for (const achievement of xpData.newlyUnlockedAchievements) {
                    setTimeout(() => {
                      toast({
                        title: `🏆 Достижение разблокировано!`,
                        description: `${achievement.title}: ${achievement.description} (+${achievement.xp_reward} XP)`,
                        duration: 7000,
                      });
                    }, 600);
                  }
                }

                // Обновляем состояние задания
                setTaskStates(prev => ({
                  ...prev,
                  [taskId]: { ...prev[taskId], isCompleted: true },
                }));
              } else {
                // Успех, но XP не начислен (возможно, это не первая попытка)
                toast({
                  title: "Все тесты пройдены! ✅",
                  description: "Задание успешно выполнено",
                  variant: "default",
                  duration: 3000,
                });
                setTaskStates(prev => ({
                  ...prev,
                  [taskId]: { ...prev[taskId], isCompleted: true },
                }));
              }
            }
          } else {
            // Задание уже было выполнено ранее, не вызываем API начисления XP
            toast({
              title: "Все тесты пройдены! ✅",
              description: "Задание уже было успешно выполнено ранее. Попытка сохранена в историю.",
              variant: "default",
              duration: 3000,
            });
            setTaskStates(prev => ({
              ...prev,
              [taskId]: { ...prev[taskId], isCompleted: true },
            }));
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Ошибка выполнения тестов",
        description: errorMessage,
        variant: "destructive",
      });
      setTaskStates(prev => ({
        ...prev,
        [taskId]: { ...prev[taskId], testing: false },
      }));
    }
  };

  const handleResetCode = (taskId: string) => {
    const state = taskStates[taskId];
    if (!state) return;
    
    setTaskStates(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        code: prev[taskId].initialCode,
        executionResult: null,
        testResults: null,
      },
    }));
  };

  const handleAiHint = async (taskId: string) => {
    const state = taskStates[taskId];
    if (!state) return;
    
    setCurrentTaskId(taskId);
    
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
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON");
      }
      const data = await res.json();
      const hint = data?.hint;

      let md = ``;
      if (Array.isArray(hint?.steps) && hint.steps.length) {
        md += `### Шаги к решению\n\n${hint.steps.map((step: string, i: number) => `${i + 1}. ${step}`).join("\n")}`;
      } else {
        md += hint?.hint || "Попробуйте ещё раз";
      }

      setHintTitle(`AI-помощник`);
      setHintMarkdown(md);
      setHintOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Неизвестная ошибка";
      toast({
        title: "Ошибка подсказки",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const handleCodeChange = (taskId: string, value: string | undefined) => {
    setTaskStates(prev => {
      const currentState = prev[taskId];
      const task = tasks.find(t => t.id === taskId);
      if (!currentState && task) {
        // Создаем новое состояние, если его еще нет
        return {
          ...prev,
          [taskId]: {
            code: value || task.starter_code || "",
            initialCode: task.starter_code || "",
            executionResult: null,
            testResults: null,
            running: false,
            testing: false,
            isCompleted: false,
            lastAttempt: null,
          },
        };
      }
      return {
        ...prev,
        [taskId]: { ...currentState, code: value || "" },
      };
    });
  };

  const getStatusConfig = (status: TaskStatus) => {
    switch (status) {
      case "completed":
        return { 
          label: "Завершено", 
          icon: "🟢", 
          variant: "secondary" as const, 
          className: "" // Используем стандартный стиль secondary, как у бейджа XP
        };
      case "in_progress":
        return { 
          label: "В процессе", 
          icon: "🟡", 
          variant: "secondary" as const, 
          className: "" // Используем стандартный стиль secondary, как у бейджа XP
        };
      default:
        return { 
          label: "Не начато", 
          icon: "🔴", 
          variant: "secondary" as const, 
          className: "" // Используем стандартный стиль secondary, как у бейджа XP
        };
    }
  };

  // Функция для прокрутки к заданию
  const scrollToTask = (taskId: string) => {
    const element = document.getElementById(`task-${taskId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      // Открываем accordion если закрыт
      if (!openItems.includes(taskId)) {
        setOpenItems([...openItems, taskId]);
      }
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8">
          {/* Боковое меню навигации */}
          <aside className="hidden lg:block">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <List className="h-4 w-4" />
                  Навигация
                </CardTitle>
              </CardHeader>
              <CardContent>
                <nav className="space-y-1">
                  <button
                    onClick={() => {
                      document.getElementById("theory-section")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  >
                    📚 Теория
                  </button>
                  {sortedTasks.map((task, index) => {
                    const statusConfig = getStatusConfig(task.status);
                    return (
                      <button
                        key={task.id}
                        onClick={() => scrollToTask(task.id)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors flex items-center justify-between group ${
                          openItems.includes(task.id) ? "bg-accent" : ""
                        }`}
                      >
                        <span className="truncate">
                          {index + 1}. {task.title}
                        </span>
                        <span className="ml-2 text-xs opacity-70 group-hover:opacity-100">
                          {statusConfig.icon}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Основной контент */}
          <div>
        {/* Заголовок модуля */}
        <div className="mb-8" id="theory-section">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{module.title}</h1>
              <p className="text-lg text-muted-foreground">{module.topic}</p>
            </div>
            <Badge variant="outline">Уровень {module.level}</Badge>
          </div>
        </div>

        {/* Статистика изучения */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Прогресс</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTaskIds.length} / {tasks.length}</div>
              <p className="text-xs text-muted-foreground">заданий завершено</p>
              <Progress value={moduleProgress} className="mt-2 h-2" />
            </CardContent>
          </Card>

          {userProgress && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Заработано XP</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userProgress.xpEarned}</div>
                  <p className="text-xs text-muted-foreground">очков за модуль</p>
                </CardContent>
              </Card>

              {userProgress.avgScore !== undefined && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Средний балл</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userProgress.avgScore.toFixed(0)}%</div>
                    <p className="text-xs text-muted-foreground">AI-оценка</p>
                  </CardContent>
                </Card>
              )}

              {userProgress.timeSpent !== undefined && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Время</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Math.round(userProgress.timeSpent / 60)}</div>
                    <p className="text-xs text-muted-foreground">минут</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Теория модуля */}
        {module.description && (
          <Card className="mb-8">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="theory">
                <AccordionTrigger className="px-6">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    <span className="font-semibold">Теория модуля</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        code(props) {
                          const { node, className, children, ...rest } = props as any;
                          const inline = !className || !className.includes('language-');
                          const match = /language-(\w+)/.exec(className || "");
                          const isDark = mounted && (
                            theme === "dark" || 
                            (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)
                          );
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={(isDark ? oneDark : oneLight) as any}
                              language={match[1]}
                              PreTag="div"
                              className="font-ubuntu-mono rounded-md"
                              customStyle={{ fontFamily: 'Ubuntu Mono, monospace' }}
                              {...rest}
                            >
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={`font-ubuntu-mono ${className}`} {...rest}>
                              {children}
                            </code>
                          );
                        },
                        p: ({ children }) => <p className="mb-4 last:mb-0 whitespace-pre-line">{children}</p>,
                      }}
                    >
                      {module.description}
                    </ReactMarkdown>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        )}

        {/* Фильтры и сортировка */}
        <div className="flex flex-wrap gap-4 mb-6 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Фильтр" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все задания</SelectItem>
                <SelectItem value="completed">Завершенные</SelectItem>
                <SelectItem value="in_progress">В процессе</SelectItem>
                <SelectItem value="not_started">Не начатые</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order">По порядку</SelectItem>
                <SelectItem value="status">По статусу</SelectItem>
                <SelectItem value="difficulty">По сложности</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto text-sm text-muted-foreground">
            Показано: {sortedTasks.length} из {tasks.length}
          </div>
        </div>

        {/* Список заданий */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4">
            <BookOpen className="inline mr-2 h-6 w-6" />
            Задания ({sortedTasks.length})
          </h2>

          {sortedTasks.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Нет заданий, соответствующих выбранным фильтрам
                </p>
              </CardContent>
            </Card>
          ) : (
            <Accordion 
              type="multiple" 
              className="w-full space-y-4"
              value={openItems}
              onValueChange={setOpenItems}
            >
              {sortedTasks.map((task, index) => {
                const state = taskStates[task.id];
                const statusConfig = getStatusConfig(task.status);
                const testCases: TestCase[] = Array.isArray(task.test_cases)
                  ? (task.test_cases as unknown as TestCase[])
                  : [];

                return (
                  <Card key={task.id} id={`task-${task.id}`} className="overflow-hidden scroll-mt-24 hover:shadow-lg transition-shadow">
                    <AccordionItem value={task.id} className="border-none">
                      <AccordionTrigger className="px-6 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg">Задание {index + 1}</span>
                              <span className="text-lg font-bold">{task.title}</span>
                            </div>
                            <Badge 
                              variant={task.difficulty === "hard" ? "destructive" : "default"}
                              className={
                                task.difficulty === "easy" 
                                  ? "bg-green-500 hover:bg-green-600 text-white border-transparent"
                                  : task.difficulty === "medium"
                                  ? "bg-yellow-500 hover:bg-yellow-600 text-white border-transparent"
                                  : undefined
                              }
                            >
                              {task.difficulty === "easy"
                                ? "Легкое"
                                : task.difficulty === "medium"
                                  ? "Среднее"
                                  : "Сложное"}
                            </Badge>
                            <Badge variant="secondary">+{(task.difficulty === "easy" ? 10 : task.difficulty === "medium" ? 20 : 30)} XP</Badge>
                          </div>
                          <Badge variant={statusConfig.variant} className={statusConfig.className || undefined}>
                            <span className="mr-1">{statusConfig.icon}</span>
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="space-y-6">
                          {/* Описание задания */}
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm, remarkBreaks]}
                              components={{
                                code({ node, inline, className, children, ...props }: any) {
                                  const match = /language-(\w+)/.exec(className || "");
                                  const isDark = mounted && (
                                    theme === "dark" || 
                                    (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)
                                  );
                                  const inlineProp = (props as any).inline;
                                  return !inlineProp && match ? (
                                    <SyntaxHighlighter
                                      style={(isDark ? oneDark : oneLight) as any}
                                      language={match[1]}
                                      PreTag="div"
                                      className="font-ubuntu-mono rounded-md"
                                      customStyle={{ fontFamily: 'Ubuntu Mono, monospace' }}
                                    >
                                      {String(children).replace(/\n$/, "")}
                                    </SyntaxHighlighter>
                                  ) : (
                                    <code className={`font-ubuntu-mono ${className}`} {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                p: ({ children }) => <p className="mb-4 last:mb-0 whitespace-pre-line">{children}</p>,
                              }}
                            >
                              {task.description}
                            </ReactMarkdown>
                          </div>

                          {/* Редактор кода */}
                          <Card>
                            <CardHeader>
                              <CardTitle>Редактор кода</CardTitle>
                              <CardDescription>
                                Напишите решение задачи на Python
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <CodeEditor
                                value={state?.code || task.starter_code || ""}
                                onChange={(value) => handleCodeChange(task.id, value)}
                                height="400px"
                                language="python"
                              />

                              {/* Кнопки управления */}
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  onClick={() => handleRunCode(task.id)}
                                  variant="default"
                                  disabled={state?.running || pyodideLoading || !(state?.code || task.starter_code || "").trim()}
                                >
                                  {state?.running ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Выполнение...
                                    </>
                                  ) : (
                                    "Запустить код"
                                  )}
                                </Button>
                                <Button
                                  onClick={() => handleTestTask(task.id)}
                                  variant="default"
                                  disabled={state?.testing || pyodideLoading || !(state?.code || task.starter_code || "").trim()}
                                >
                                  {state?.testing ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Проверка...
                                    </>
                                  ) : (
                                    "Проверить задание"
                                  )}
                                </Button>
                                <Button
                                  onClick={() => handleResetCode(task.id)}
                                  variant="outline"
                                  disabled={(state?.code || task.starter_code || "") === (state?.initialCode || task.starter_code || "")}
                                >
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Сбросить код
                                </Button>
                                <Button onClick={() => handleAiHint(task.id)} variant="outline">
                                  <Sparkles className="mr-2 h-4 w-4" />
                                  AI-подсказка
                                </Button>
                              </div>

                              {/* Отображение ошибки Pyodide */}
                              {pyodideError && (
                                <div className="mt-4 p-4 rounded-md bg-destructive/10 border border-destructive">
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                                    <div>
                                      <h4 className="font-medium text-destructive">Ошибка загрузки Python среды</h4>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {pyodideError.message}
                                      </p>
                                      <Button
                                        onClick={() => window.location.reload()}
                                        variant="outline"
                                        size="sm"
                                        className="mt-2"
                                      >
                                        Перезагрузить страницу
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Индикатор загрузки Pyodide */}
                              {pyodideLoading && (
                                <div className="mt-4 p-4 rounded-md bg-muted">
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Загрузка Python среды... Это может занять несколько секунд</span>
                                  </div>
                                </div>
                              )}

                              {/* Выполнение кода */}
                              {state?.executionResult && (
                                <Card className="mt-4">
                                  <CardHeader>
                                    <CardTitle>
                                      {state.executionResult.error ? "Ошибка выполнения" : "Код выполнен успешно"}
                                    </CardTitle>
                                    {state.executionResult.executionTime > 0 && (
                                      <CardDescription>
                                        Время выполнения: {state.executionResult.executionTime} мс
                                      </CardDescription>
                                    )}
                                  </CardHeader>
                                  <CardContent>
                                    {state.executionResult.error ? (
                                      <div className="rounded-md bg-destructive/10 p-4">
                                        <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">
                                          {state.executionResult.error}
                                        </pre>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <h4 className="text-sm font-medium">Вывод:</h4>
                                        <div className="rounded-md bg-muted p-4">
                                          <pre className="text-sm whitespace-pre-wrap font-mono">
                                            {state.executionResult.output || "(нет вывода)"}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )}

                              {/* Результаты тестов */}
                              {state?.testResults && (
                                <div className="mt-4">
                                  <TestResults testResults={state.testResults} testCases={testCases} />
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Card>
                );
              })}
            </Accordion>
          )}
        </div>
          </div>
        </div>
      </div>

      {/* Модальное окно AI подсказки */}
      <Dialog open={hintOpen} onOpenChange={setHintOpen}>
        <DialogContent aria-describedby="hint-description" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {hintTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Card className="font-ubuntu-mono">
              <CardContent className="pt-6">
                <div className="prose prose-sm dark:prose-invert max-w-none [&_*]:font-ubuntu-mono [&_h1]:font-ubuntu-mono [&_h2]:font-ubuntu-mono [&_h3]:font-ubuntu-mono [&_li]:font-ubuntu-mono [&_strong]:font-ubuntu-mono [&_em]:font-ubuntu-mono">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || "");
                        const isDark = mounted && (
                          theme === "dark" || 
                          (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)
                        );
                        const inlineProp = (props as any).inline;
                        return !inlineProp && match ? (
                          <SyntaxHighlighter
                            style={(isDark ? oneDark : oneLight) as any}
                            language={match[1]}
                            PreTag="div"
                            className="font-ubuntu-mono rounded-md"
                            customStyle={{ fontFamily: 'Ubuntu Mono, monospace' }}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={`font-ubuntu-mono ${className}`} {...props}>
                            {children}
                          </code>
                        );
                      },
                      p: ({ children }) => <p className="mb-4 last:mb-0 whitespace-pre-line font-ubuntu-mono">{children}</p>,
                    }}
                  >
                    {hintMarkdown}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-center mt-4">
            <Button onClick={() => setHintOpen(false)}>Ok</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модальное окно AI оценки */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent aria-describedby="feedback-description" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              {feedbackTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Card className="font-ubuntu-mono">
              <CardContent className="pt-6">
                <div id="feedback-description" className="prose prose-sm dark:prose-invert max-w-none [&_*]:font-ubuntu-mono [&_h1]:font-ubuntu-mono [&_h2]:font-ubuntu-mono [&_h3]:font-ubuntu-mono [&_li]:font-ubuntu-mono [&_strong]:font-ubuntu-mono [&_em]:font-ubuntu-mono">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || "");
                        const isDark = mounted && (
                          theme === "dark" || 
                          (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)
                        );
                        const inlineProp = (props as any).inline;
                        return !inlineProp && match ? (
                          <SyntaxHighlighter
                            style={(isDark ? oneDark : oneLight) as any}
                            language={match[1]}
                            PreTag="div"
                            className="font-ubuntu-mono rounded-md"
                            customStyle={{ fontFamily: 'Ubuntu Mono, monospace' }}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={`font-ubuntu-mono ${className}`} {...props}>
                            {children}
                          </code>
                        );
                      },
                      p: ({ children }) => <p className="mb-4 last:mb-0 whitespace-pre-line font-ubuntu-mono">{children}</p>,
                    }}
                  >
                    {feedbackMarkdown}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-center mt-4">
            <Button onClick={() => setFeedbackOpen(false)}>Ok</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

