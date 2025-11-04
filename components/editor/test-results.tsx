"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TestSuiteResult, TestResult } from "@/types/test-case";
import { CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";

interface TestResultsProps {
  testResults: TestSuiteResult;
  testCases: Array<{
    id: string;
    description: string;
    is_visible: boolean;
  }>;
}

export function TestResults({ testResults, testCases }: TestResultsProps) {
  // Получаем информацию о тесте для каждого результата
  const getTestCaseInfo = (testCaseId: string) => {
    return testCases.find((tc) => tc.id === testCaseId);
  };

  // Фильтруем результаты - показываем только видимые тесты
  const visibleResults = testResults.results.filter((result) => {
    const testCase = getTestCaseInfo(result.testCaseId);
    return testCase?.is_visible ?? true;
  });

  const visiblePassedCount = visibleResults.filter((r) => r.passed).length;
  const visibleTotalCount = visibleResults.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Результаты тестов</CardTitle>
            <CardDescription>
              {visiblePassedCount} из {visibleTotalCount} тестов пройдено
            </CardDescription>
          </div>
          {testResults.allPassed ? (
            <Badge className="bg-primary text-primary-foreground">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Все тесты пройдены!
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="mr-1 h-3 w-3" />
              Есть ошибки
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleResults.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Нет видимых тестов для отображения
          </p>
        ) : (
          <div className="space-y-3">
            {visibleResults.map((result) => {
              const testCase = getTestCaseInfo(result.testCaseId);
              return (
                <div
                  key={result.testCaseId}
                  className={`p-4 rounded-lg border ${
                    result.passed
                      ? "bg-primary/10 border-primary/30"
                      : "bg-destructive/10 border-destructive/30"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                      <span className="font-medium">
                        {testCase?.description || `Тест ${result.testCaseId}`}
                      </span>
                    </div>
                    {result.executionTime && (
                      <Badge variant="outline" className="text-xs">
                        {result.executionTime} мс
                      </Badge>
                    )}
                  </div>

                  {!result.passed && (
                    <div className="mt-3 space-y-2 text-sm">
                      {result.error && (
                        <div className="p-2 bg-destructive/20 rounded">
                          <p className="font-medium text-destructive">
                            Ошибка:
                          </p>
                          <pre className="text-xs text-destructive/90 mt-1 whitespace-pre-wrap font-mono">
                            {result.error}
                          </pre>
                        </div>
                      )}
                      {result.actualOutput !== undefined && (
                        <div>
                          <p className="text-muted-foreground">
                            Получено:{" "}
                            <code className="bg-muted px-1 rounded">
                              {String(result.actualOutput)}
                            </code>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Информация о скрытых тестах */}
        {testResults.totalCount > visibleTotalCount && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <EyeOff className="h-3 w-3" />
              {testResults.totalCount - visibleTotalCount} скрытых тестов не показаны
            </p>
          </div>
        )}

        {/* Общее время выполнения */}
        {testResults.executionTime > 0 && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Общее время выполнения: {testResults.executionTime} мс
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

