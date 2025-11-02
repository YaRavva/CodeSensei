"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usePyodide } from "@/hooks/use-pyodide";
import { useState } from "react";
import { Play, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface CodeRunnerProps {
  code: string;
  onExecutionComplete?: (result: {
    output: string;
    error: string | null;
    executionTime: number;
  }) => void;
}

export function CodeRunner({ code, onExecutionComplete }: CodeRunnerProps) {
  const { pyodide, loading, error: pyodideError, executeCode } = usePyodide();
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{
    output: string;
    error: string | null;
    executionTime: number;
  } | null>(null);

  async function handleRun() {
    if (!code.trim()) {
      setResult({
        output: "",
        error: "Код не может быть пустым",
        executionTime: 0,
      });
      return;
    }

    setExecuting(true);
    setResult(null);

    try {
      const executionResult = await executeCode(code, 10000);
      setResult(executionResult);
      if (onExecutionComplete) {
        onExecutionComplete(executionResult);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setResult({
        output: "",
        error: errorMessage,
        executionTime: 0,
      });
      if (onExecutionComplete) {
        onExecutionComplete({
          output: "",
          error: errorMessage,
          executionTime: 0,
        });
      }
    } finally {
      setExecuting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Загрузка Python среды</CardTitle>
          <CardDescription>
            Загружается Pyodide... Это может занять несколько секунд
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress className="w-full" />
          <p className="text-sm text-muted-foreground mt-4">
            Загрузка Python интерпретатора в браузер...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (pyodideError) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Ошибка загрузки Pyodide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {pyodideError.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handleRun}
        disabled={executing || !pyodide}
        className="w-full"
      >
        {executing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Выполнение...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Запустить код
          </>
        )}
      </Button>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.error ? (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Ошибка выполнения
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Код выполнен успешно
                </>
              )}
            </CardTitle>
            {result.executionTime > 0 && (
              <CardDescription>
                Время выполнения: {result.executionTime} мс
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {result.error ? (
              <div className="rounded-md bg-destructive/10 p-4">
                <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">
                  {result.error}
                </pre>
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Вывод:</h4>
                <div className="rounded-md bg-muted p-4">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {result.output || "(нет вывода)"}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

