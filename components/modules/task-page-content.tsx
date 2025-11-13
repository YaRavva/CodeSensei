"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeEditor } from "@/components/editor/code-editor";
import { TestResults } from "@/components/editor/test-results";
import { ErrorDisplay } from "@/components/editor/error-display";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { runTestSuite } from "@/lib/utils/test-runner";
import { usePyodide } from "@/hooks/use-pyodide";
import type { TestCase, TestSuiteResult } from "@/types/test-case";
import { ArrowLeft, ArrowRight, BookOpen, RotateCcw, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "@/components/theme-provider";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Module = Database["public"]["Tables"]["modules"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];
type TaskAttempt = Database["public"]["Tables"]["task_attempts"]["Row"];

interface TaskPageContentProps {
  module: Module;
  task: Task;
  prevTask: { id: string; title: string } | null;
  nextTask: { id: string; title: string } | null;
  lastAttempt: TaskAttempt | null;
}

export function TaskPageContent({ module, task, prevTask, nextTask, lastAttempt }: TaskPageContentProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  const { pyodide, loading: pyodideLoading, error: pyodideError, executeCode } = usePyodide();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Сохраняем время открытия задания в localStorage
    if (typeof window !== "undefined") {
      const openTimeKey = `task_open_time_${task.id}`;
      localStorage.setItem(openTimeKey, Date.now().toString());
    }
  }, [task.id]);

  // Состояние кода
  const [code, setCode] = useState(task.starter_code || "");
  const [initialCode] = useState(task.starter_code || "");

  // Состояние выполнения
  const [executionResult, setExecutionResult] = useState<{
    output: string;
    error: string | null;
    executionTime: number;
  } | null>(null);
  const [running, setRunning] = useState(false);

  // Состояние тестов
  const [testResults, setTestResults] = useState<TestSuiteResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(lastAttempt?.is_successful || false);
  
  // Дебаунс для кнопки проверки задания (защита от спама)
  const testTaskDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Состояние AI-подсказки (модалка)
  const [hintOpen, setHintOpen] = useState(false);
  const [hintTitle, setHintTitle] = useState<string>("");
  const [hintMarkdown, setHintMarkdown] = useState<string>("");

  // Состояние AI-оценки (модалка)
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState<string>("");
  const [feedbackMarkdown, setFeedbackMarkdown] = useState<string>("");

  // Загружаем сохраненный код из последней попытки, если есть
  useEffect(() => {
    if (lastAttempt?.code_solution && !code) {
      setCode(lastAttempt.code_solution);
    }
  }, [lastAttempt, code]);

  // Парсим тестовые случаи
  const testCases: TestCase[] = Array.isArray(task.test_cases)
    ? (task.test_cases as unknown as TestCase[])
    : [];

  async function handleRunCode() {
    if (pyodideError) {
      toast({
        title: "Ошибка Pyodide",
        description: "Не удалось загрузить Python среду. Попробуйте перезагрузить страницу.",
        variant: "destructive",
        action: (
          <ToastAction altText="Перезагрузить" onClick={() => window.location.reload()}>
            Перезагрузить
          </ToastAction>
        ),
      });
      return;
    }

    if (!pyodide || !code.trim()) {
      const msg = pyodide ? "Код не может быть пустым" : "Python среда еще не загружена. Подождите немного.";
      toast({
        title: "Ошибка",
        description: msg,
        variant: "destructive",
        action: (
          <ToastAction altText="Скопировать" onClick={() => navigator.clipboard.writeText(msg)}>
            Скопировать
          </ToastAction>
        ),
      });
      return;
    }

    setRunning(true);
    setTestResults(null);
    setExecutionResult(null);

    try {
      const result = await executeCode(code, 10000);
      setExecutionResult(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setExecutionResult({
        output: "",
        error: errorMessage,
        executionTime: 0,
      });
    } finally {
      setRunning(false);
    }
  }

  async function handleTestTask() {
    // КЛИЕНТСКАЯ ЗАЩИТА ОТ ЭКСПЛОИТА: Проверяем, не выполняется ли уже проверка
    if (testing) {
      return; // Игнорируем повторные вызовы во время обработки
    }

    // Дебаунс: отменяем предыдущий таймер, если он был установлен
    if (testTaskDebounceRef.current) {
      clearTimeout(testTaskDebounceRef.current);
    }

    // Устанавливаем новый таймер для дебаунса (500мс)
    // Если кнопка будет нажата повторно в течение 500мс, предыдущий вызов будет отменен
    testTaskDebounceRef.current = setTimeout(async () => {
      testTaskDebounceRef.current = null;
      await executeTestTask();
    }, 500);
  }

  async function executeTestTask() {
    if (pyodideError) {
      toast({
        title: "Ошибка Pyodide",
        description: "Не удалось загрузить Python среду. Попробуйте перезагрузить страницу.",
        variant: "destructive",
        action: (
          <ToastAction altText="Перезагрузить" onClick={() => window.location.reload()}>
            Перезагрузить
          </ToastAction>
        ),
      });
      return;
    }

    if (!pyodide) {
      const msg = "Python среда еще не загружена. Подождите немного.";
      toast({
        title: "Ошибка",
        description: msg,
        variant: "destructive",
        action: (
          <ToastAction altText="Скопировать" onClick={() => navigator.clipboard.writeText(msg)}>
            Скопировать
          </ToastAction>
        ),
      });
      return;
    }

    if (!code.trim()) {
      toast({
        title: "Ошибка",
        description: "Код не может быть пустым",
        variant: "destructive",
      });
      return;
    }

    // КЛИЕНТСКАЯ ЗАЩИТА ОТ ЭКСПЛОИТА: Если задание уже выполнено, показываем сообщение
    // Серверная проверка всё равно защитит, но это улучшает UX
    if (isCompleted) {
      toast({
        title: "Задание уже выполнено",
        description: "Это задание уже было успешно выполнено. Вы можете улучшить решение, но XP не будет начислен повторно.",
        variant: "default",
        duration: 3000,
      });
    }

    setTesting(true);
    setTestResults(null);

    try {
      const results = await runTestSuite(code, testCases, pyodide);
      setTestResults(results);

      if (results.allPassed) {
        // AI-оценка решения (сервер)
        try {
          const evalRes = await fetch("/api/tasks/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskId: task.id,
              code,
              runtimeOutput: executionResult?.output,
              testSummary: { allPassed: results.allPassed, passedCount: results.passedCount, total: results.totalCount },
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

        // Сохраняем попытку в БД и начисляем XP
        if (user) {
          const supabase = createClient();
          
          // Получаем количество попыток для этого задания
          const { count: attemptsCount } = await supabase
            .from("task_attempts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("task_id", task.id);

          const attemptNumber = (attemptsCount || 0) + 1;

          // Проверяем, есть ли успешные попытки
          const { data: successfulAttempts } = await supabase
            .from("task_attempts")
            .select("id")
            .eq("user_id", user.id)
            .eq("task_id", task.id)
            .eq("is_successful", true);

          const isFirstSuccessfulAttempt =
            results.allPassed && (!successfulAttempts || successfulAttempts.length === 0);

          // Вычисляем время решения (от открытия до проверки)
          let solvingTimeMs: number | null = null;
          if (typeof window !== "undefined") {
            const openTimeKey = `task_open_time_${task.id}`;
            const openTimeStr = localStorage.getItem(openTimeKey);
            if (openTimeStr) {
              const openTime = parseInt(openTimeStr, 10);
              const currentTime = Date.now();
              solvingTimeMs = currentTime - openTime;
              // Удаляем время открытия после использования
              localStorage.removeItem(openTimeKey);
            }
          }

          // Сохраняем попытку
          const { error: attemptError } = await (supabase
            .from("task_attempts") as any)
            .insert({
              user_id: user.id,
              task_id: task.id,
              code_solution: code,
              test_results: results as any,
              is_successful: results.allPassed,
              execution_time_ms: results.executionTime,
              solving_time_ms: solvingTimeMs,
              error_message: results.results.find((r) => !r.passed)?.error ?? null,
              used_ai_hint: false, // TODO: отслеживать использование AI-подсказок
            });

          if (attemptError) {
            console.error("Error saving attempt:", attemptError);
          }

          // КЛИЕНТСКАЯ ЗАЩИТА ОТ ЭКСПЛОИТА: Не вызываем API начисления XP, если задание уже было выполнено
          // Это уменьшает нагрузку на сервер и улучшает UX
          // Серверная проверка всё равно защитит от обхода этой проверки
          if (!isCompleted || isFirstSuccessfulAttempt) {
            // Начисляем XP при успешном выполнении по тестам (AI в следующем шаге)
            const xpResponse = await fetch("/api/tasks/award-xp", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                taskId: task.id,
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
                setIsCompleted(true);
              } else if (xpData.xpAwarded > 0) {
                // XP был начислен
                toast({
                  title: "Поздравляем! 🎉",
                  description: `Все тесты пройдены! Вы заработали ${xpData.xpAwarded} XP${xpData.newLevel !== undefined && xpData.newLevel !== null ? ` (Уровень ${xpData.newLevel})` : ""}`,
                  duration: 5000,
                });

                // Показываем уведомления о новых достижениях
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

                setIsCompleted(true);
              } else {
                // Успех, но XP не начислен (возможно, это не первая попытка)
                toast({
                  title: "Все тесты пройдены! ✅",
                  description: "Задание успешно выполнено",
                  variant: "default",
                  duration: 3000,
                });
                setIsCompleted(true);
              }
            } else {
              toast({
                title: "Все тесты пройдены! 🎉",
                description: "Ошибка при начислении XP, но задание засчитано",
                variant: "default",
              });
              setIsCompleted(true);
            }
          } else {
            // Задание уже было выполнено ранее, не вызываем API начисления XP
            toast({
              title: "Все тесты пройдены! ✅",
              description: "Задание уже было успешно выполнено ранее. Попытка сохранена в историю.",
              variant: "default",
              duration: 3000,
            });
            setIsCompleted(true);
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast({
        title: "Ошибка выполнения тестов",
        description: errorMessage,
        variant: "destructive",
        action: (
          <ToastAction altText="Скопировать" onClick={() => navigator.clipboard.writeText(errorMessage)}>
            Скопировать
          </ToastAction>
        ),
      });
    } finally {
      setTesting(false);
    }
  }

  function handleResetCode() {
    setCode(initialCode);
    setExecutionResult(null);
    setTestResults(null);
  }

  async function handleAiHint() {
    try {
      const res = await fetch("/api/ai/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, code }),
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
        action: (
          <ToastAction altText="Скопировать" onClick={() => navigator.clipboard.writeText(msg)}>
            Скопировать
          </ToastAction>
        ),
      });
    }
  }

  return (
    <>
    <div className="container mx-auto px-4 py-8">
      {/* Навигация */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link href={`/modules/${module.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к модулю
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/modules" className="hover:underline">
            Модули
          </Link>
          <span>/</span>
          <Link href={`/modules/${module.id}`} className="hover:underline">
            {module.title}
          </Link>
          <span>{task.title}</span>
        </div>
      </div>

      {/* Заголовок задания */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{task.title}</h1>
            <div className="flex items-center gap-4 flex-wrap">
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
              {(lastAttempt?.is_successful || isCompleted) && (
                <Badge className="bg-green-600 text-white">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Выполнено
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Левая колонка: Теория и Описание */}
        <div className="space-y-6">
          {/* Теория модуля */}
          {module.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Теория
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}

          {/* Описание задания */}
          <Card>
            <CardHeader>
              <CardTitle>Описание задания</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>

        {/* Правая колонка: Редактор кода */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Редактор кода</CardTitle>
              <CardDescription>
                Напишите решение задачи на Python
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CodeEditor
                value={code}
                onChange={(value) => setCode(value || "")}
                height="400px"
                language="python"
              />

              {/* Кнопки управления */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleRunCode}
                  variant="default"
                  disabled={running || pyodideLoading || !code.trim()}
                >
                  {running ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Выполнение...
                    </>
                  ) : (
                    "Запустить код"
                  )}
                </Button>
                <Button
                  onClick={handleTestTask}
                  variant="default"
                  disabled={testing || pyodideLoading || !code.trim()}
                >
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Проверка...
                    </>
                  ) : (
                    "Проверить задание"
                  )}
                </Button>
                <Button
                  onClick={handleResetCode}
                  variant="outline"
                  disabled={code === initialCode}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Сбросить код
                </Button>
                <Button onClick={handleAiHint} variant="outline">
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
            </CardContent>
          </Card>

              {/* Выполнение кода */}
          {executionResult && (
            <>
              {executionResult.error ? (
                <ErrorDisplay error={executionResult.error} code={code} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Код выполнен успешно
                    </CardTitle>
                    {executionResult.executionTime > 0 && (
                      <CardDescription>
                        Время выполнения: {executionResult.executionTime} мс
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Вывод:</h4>
                      <div className="rounded-md bg-muted p-4">
                        <pre className="text-sm whitespace-pre-wrap font-mono">
                          {executionResult.output || "(нет вывода)"}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Результаты тестов */}
          {testResults && (
            <TestResults testResults={testResults} testCases={testCases} />
          )}
        </div>
      </div>

      {/* Навигация между заданиями */}
      <div className="flex justify-between gap-4 pt-6 mt-8 border-t">
        {prevTask ? (
          <Button variant="outline" asChild>
            <Link href={`/modules/${module.id}/tasks/${prevTask.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Предыдущее задание: {prevTask.title}
            </Link>
          </Button>
        ) : (
          <div />
        )}
        {nextTask ? (
          <Button variant="outline" asChild>
            <Link href={`/modules/${module.id}/tasks/${nextTask.id}`}>
              Следующее задание: {nextTask.title}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div />
        )}
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