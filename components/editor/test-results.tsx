"use client";

import { CheckCircle2, EyeOff, XCircle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TestSuiteResult } from "@/types/test-case";

interface TestResultsProps {
  testResults: TestSuiteResult;
  testCases: Array<{
    id: string;
    description: string;
    is_visible: boolean;
  }>;
}

export function TestResults({ testResults, testCases }: TestResultsProps) {
  const getTestCaseInfo = (testCaseId: string) => {
    return testCases.find((tc) => tc.id === testCaseId);
  };

  const visibleResults = testResults.results.filter((result) => {
    const testCase = getTestCaseInfo(result.testCaseId);
    return testCase?.is_visible ?? true;
  });

  const visiblePassedCount = visibleResults.filter((r) => r.passed).length;
  const visibleTotalCount = visibleResults.length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-lg font-semibold tracking-tight">
              Результаты тестов
            </CardTitle>
            <CardDescription className="mt-1 text-sm">
              {visiblePassedCount} из {visibleTotalCount} тестов пройдено
            </CardDescription>
          </div>
          {testResults.allPassed ? (
            <Badge
              variant="success"
              className="shrink-0 gap-1.5 px-3 py-1 text-sm font-semibold"
            >
              <CheckCircle2 className="size-4" />
              Все тесты пройдены
            </Badge>
          ) : (
            <Badge
              variant="destructive"
              className="shrink-0 gap-1.5 px-3 py-1 text-sm font-semibold"
            >
              <XCircle className="size-4" />
              Есть ошибки
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {visibleResults.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Нет видимых тестов для отображения
          </p>
        ) : (
          <div className="space-y-3">
            {visibleResults.map((result) => {
              const testCase = getTestCaseInfo(result.testCaseId);
              return (
                <div
                  key={result.testCaseId}
                  className={`rounded-lg border p-4 transition-colors ${
                    result.passed
                      ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                      : "border-destructive/25 bg-destructive/[0.06]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`mt-0.5 shrink-0 rounded-full p-1 ${
                          result.passed
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {result.passed ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <XCircle className="size-4" />
                        )}
                      </div>
                      <span className="text-sm font-medium leading-snug">
                        {testCase?.description || `Тест ${result.testCaseId}`}
                      </span>
                    </div>
                    {result.executionTime && (
                      <Badge
                        variant="outline"
                        className="shrink-0 gap-1 text-xs font-medium"
                      >
                        <Zap className="size-3" />
                        {result.executionTime} мс
                      </Badge>
                    )}
                  </div>

                  {!result.passed && (
                    <div className="mt-3 space-y-2 pl-7">
                      {result.error && (
                        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3">
                          <p className="text-xs font-semibold text-destructive">
                            Ошибка
                          </p>
                          <pre className="mt-1.5 whitespace-pre-wrap font-mono text-xs leading-relaxed text-destructive/90">
                            {result.error}
                          </pre>
                        </div>
                      )}
                      {result.actualOutput !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Получено:{" "}
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                            {String(result.actualOutput)}
                          </code>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {testResults.totalCount > visibleTotalCount && (
          <div className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
            <EyeOff className="size-3.5 shrink-0" />
            <span>
              {testResults.totalCount - visibleTotalCount} скрытых тестов не
              показаны
            </span>
          </div>
        )}

        {testResults.executionTime > 0 && (
          <div className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
            <Zap className="size-3.5 shrink-0" />
            <span>Общее время выполнения: {testResults.executionTime} мс</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
