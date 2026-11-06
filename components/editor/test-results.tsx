"use client";

import { CheckCircle2, CircleAlert, XCircle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicTestCase, TestSuiteResult } from "@/types/test-case";

interface TestResultsProps {
  testResults: TestSuiteResult;
  testCases: PublicTestCase[];
}

function formatValue(value: unknown): string {
  if (value === undefined) return "не получено";
  if (value === null) return "None";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatInput(input: Record<string, unknown>): string {
  return Object.entries(input)
    .map(([key, value]) => `${key} = ${formatValue(value)}`)
    .join(", ");
}

export function TestResults({ testResults, testCases }: TestResultsProps) {
  const getTestCase = (testCaseId: string) => testCases.find((test) => test.id === testCaseId);
  const failedCount = testResults.totalCount - testResults.passedCount;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-lg font-semibold tracking-tight">
              Результаты проверки
            </CardTitle>
            <CardDescription className="mt-1 text-sm">
              Пройдено {testResults.passedCount} из {testResults.totalCount} проверок
              {failedCount > 0 ? ` · ошибок: ${failedCount}` : ""}
            </CardDescription>
          </div>
          {testResults.allPassed ? (
            <Badge variant="success" className="shrink-0 gap-2 px-3 py-1 text-sm font-semibold">
              <CheckCircle2 className="size-4" />
              Решение принято
            </Badge>
          ) : (
            <Badge variant="destructive" className="shrink-0 gap-2 px-3 py-1 text-sm font-semibold">
              <XCircle className="size-4" />
              Нужно исправить
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        {testResults.results.map((result, index) => {
          const testCase = getTestCase(result.testCaseId);
          // The expected value of a hidden check is not known to the browser.
          const expected = testCase?.expected_output;
          const input = testCase?.input ?? {};
          const isHidden = testCase ? testCase.is_visible === false : false;

          return (
            <section
              key={result.testCaseId}
              className={`rounded-lg border p-4 ${
                result.passed
                  ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                  : "border-destructive/25 bg-destructive/[0.06]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
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
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">
                      Проверка {index + 1}: {testCase?.description || result.testCaseId}
                    </p>
                    {Object.keys(input).length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Входные данные:{" "}
                        <code className="rounded bg-muted px-1.5 py-0.5">{formatInput(input)}</code>
                      </p>
                    )}
                  </div>
                </div>
                {result.executionTime !== undefined && (
                  <Badge variant="outline" className="shrink-0 gap-1 text-xs font-medium">
                    <Zap className="size-3" />
                    {result.executionTime} мс
                  </Badge>
                )}
              </div>

              <div className="mt-3 grid gap-2 pl-8 text-xs sm:grid-cols-2">
                <div className="rounded-md border border-border/70 bg-background/60 p-3">
                  <p className="mb-1 font-semibold text-muted-foreground">Ожидалось</p>
                  <pre className="whitespace-pre-wrap break-words font-mono text-foreground">
                    {isHidden ? "скрытая проверка" : formatValue(expected)}
                  </pre>
                </div>
                <div className="rounded-md border border-border/70 bg-background/60 p-3">
                  <p className="mb-1 font-semibold text-muted-foreground">Получено</p>
                  <pre className="whitespace-pre-wrap break-words font-mono text-foreground">
                    {formatValue(result.actualOutput)}
                  </pre>
                </div>
              </div>

              {result.error && (
                <div className="mt-2 flex gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 pl-8">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div>
                    <p className="text-xs font-semibold text-destructive">Что нужно исправить</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-destructive/90">
                      {result.error}
                    </p>
                  </div>
                </div>
              )}
            </section>
          );
        })}

        {testResults.executionTime > 0 && (
          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <Zap className="size-3.5 shrink-0" />
            <span>Общее время проверки: {testResults.executionTime} мс</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
