"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeEditor } from "@/components/editor/code-editor";
import { TestResults } from "@/components/editor/test-results";
import { useAuth } from "@/components/auth/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { runTestSuite } from "@/lib/utils/test-runner";
import { usePyodide } from "@/hooks/use-pyodide";
import type { TestCase, TestSuiteResult } from "@/types/test-case";
import { ArrowLeft, ArrowRight, BookOpen, RotateCcw, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

type Module = Database["public"]["Tables"]["modules"]["Row"];
type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];
type TaskAttempt = Database["public"]["Tables"]["task_attempts"]["Row"];

interface TaskPageContentProps {
  module: Module;
  lesson: Lesson;
  task: Task;
  prevTask: { id: string; title: string } | null;
  nextTask: { id: string; title: string } | null;
  lastAttempt: TaskAttempt | null;
}

export function TaskPageContent({
  module,
  lesson,
  task,
  prevTask,
  nextTask,
  lastAttempt,
}: TaskPageContentProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { pyodide, loading: pyodideLoading, executeCode } = usePyodide();

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
    if (!pyodide || !code.trim()) {
      toast({
        title: "Ошибка",
        description: pyodide ? "Код не может быть пустым" : "Python среда еще не загружена. Подождите немного.",
        variant: "destructive",
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
    if (!pyodide) {
      toast({
        title: "Ошибка",
        description: "Python среда еще не загружена. Подождите немного.",
        variant: "destructive",
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

    setTesting(true);
    setTestResults(null);

    try {
      const results = await runTestSuite(code, testCases, pyodide);
      setTestResults(results);

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

        const isFirstAttempt = attemptNumber === 1;
        const isFirstSuccessfulAttempt =
          results.allPassed && (!successfulAttempts || successfulAttempts.length === 0);

        // Сохраняем попытку
        const { error: attemptError } = await supabase
          .from("task_attempts")
          .insert({
            user_id: user.id,
            task_id: task.id,
            code_solution: code,
            test_results: results as unknown,
            is_successful: results.allPassed,
            execution_time_ms: results.executionTime,
            error_message: results.results.find((r) => !r.passed)?.error ?? null,
            used_ai_hint: false, // TODO: отслеживать использование AI-подсказок
          });

        if (attemptError) {
          console.error("Error saving attempt:", attemptError);
        }

        // Начисляем XP при успешном выполнении
        if (results.allPassed) {
          try {
            const xpResponse = await fetch("/api/tasks/award-xp", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                taskId: task.id,
                lessonId: lesson.id,
                attemptNumber,
                usedAiHint: false,
                executionTime: results.executionTime,
                isFirstAttempt: isFirstSuccessfulAttempt,
              }),
            });

            const xpData = await xpResponse.json();

            if (xpResponse.ok && xpData.success) {
              // Показываем уведомление о XP
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
            } else {
              toast({
                title: "Все тесты пройдены! 🎉",
                description: "Ошибка при начислении XP, но задание засчитано",
                variant: "default",
              });
            }
          } catch (xpError) {
            console.error("Error awarding XP:", xpError);
            toast({
              title: "Все тесты пройдены! 🎉",
              description: "Ошибка при начислении XP, но задание засчитано",
              variant: "default",
            });
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

  function handleAiHint() {
    // TODO: Реализовать на ЭТАП 17
    toast({
      title: "Скоро",
      description: "AI-подсказки будут доступны в следующих обновлениях",
    });
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Навигация */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link href={`/modules/${module.id}/lessons/${lesson.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к уроку
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
          <span>/</span>
          <Link
            href={`/modules/${module.id}/lessons/${lesson.id}`}
            className="hover:underline"
          >
            {lesson.title}
          </Link>
          <span>/</span>
          <span>{task.title}</span>
        </div>
      </div>

      {/* Заголовок задания */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{task.title}</h1>
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="outline">
                {task.difficulty === "easy"
                  ? "Легкое"
                  : task.difficulty === "medium"
                    ? "Среднее"
                    : "Сложное"}
              </Badge>
              {task.xp_reward && (
                <Badge variant="secondary">+{task.xp_reward} XP</Badge>
              )}
              {lastAttempt?.is_successful && (
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
          {/* Теория урока */}
          {lesson.theory && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Теория
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {lesson.theory}
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
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
            </CardContent>
          </Card>

              {/* Выполнение кода */}
          {executionResult && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {executionResult.error ? "Ошибка выполнения" : "Код выполнен успешно"}
                </CardTitle>
                {executionResult.executionTime > 0 && (
                  <CardDescription>
                    Время выполнения: {executionResult.executionTime} мс
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {executionResult.error ? (
                  <div className="rounded-md bg-destructive/10 p-4">
                    <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">
                      {executionResult.error}
                    </pre>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Вывод:</h4>
                    <div className="rounded-md bg-muted p-4">
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {executionResult.output || "(нет вывода)"}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
            <Link
              href={`/modules/${module.id}/lessons/${lesson.id}/tasks/${prevTask.id}`}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Предыдущее задание: {prevTask.title}
            </Link>
          </Button>
        ) : (
          <div />
        )}
        {nextTask ? (
          <Button variant="outline" asChild>
            <Link
              href={`/modules/${module.id}/lessons/${lesson.id}/tasks/${nextTask.id}`}
            >
              Следующее задание: {nextTask.title}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

