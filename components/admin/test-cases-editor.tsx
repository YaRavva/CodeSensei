"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export type TestCase = {
  id: string;
  description: string;
  input: Record<string, unknown>;
  expected_output: unknown;
  category: "basic" | "edge" | "error";
  is_visible: boolean;
};

interface TestCasesEditorProps {
  testCases: TestCase[];
  onChange: (testCases: TestCase[]) => void;
  disabled?: boolean;
}

export function TestCasesEditor({ testCases, onChange, disabled }: TestCasesEditorProps) {
  const { toast } = useToast();

  function addTestCase() {
    const newTestCase: TestCase = {
      id: `test_${Date.now()}`,
      description: "",
      input: {},
      expected_output: "",
      category: "basic",
      is_visible: true,
    };
    onChange([...testCases, newTestCase]);
  }

  function removeTestCase(id: string) {
    onChange(testCases.filter((tc) => tc.id !== id));
  }

  function updateTestCase(id: string, updates: Partial<TestCase>) {
    onChange(testCases.map((tc) => (tc.id === id ? { ...tc, ...updates } : tc)));
  }

  function updateInput(id: string, inputStr: string) {
    try {
      const parsed = JSON.parse(inputStr || "{}");
      updateTestCase(id, { input: parsed });
    } catch (error) {
      toast({
        title: "Ошибка JSON",
        description: "Неверный формат JSON",
        variant: "destructive",
      });
    }
  }

  function updateExpectedOutput(id: string, outputStr: string) {
    try {
      const parsed = JSON.parse(outputStr || '""');
      updateTestCase(id, { expected_output: parsed });
    } catch (error) {
      // Если не JSON, сохраняем как строку
      updateTestCase(id, { expected_output: outputStr });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Добавьте тестовые случаи для проверки решений
        </p>
        <Button type="button" onClick={addTestCase} disabled={disabled} size="sm">
          Добавить тест
        </Button>
      </div>

      {testCases.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Нет тестовых случаев. Добавьте первый тест.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {testCases.map((testCase, index) => (
          <Card key={testCase.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Тест #{index + 1}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {testCase.category === "basic"
                      ? "Базовый"
                      : testCase.category === "edge"
                        ? "Граничный"
                        : "Ошибка"}
                  </Badge>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeTestCase(testCase.id)}
                    disabled={disabled}
                  >
                    Удалить
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Описание</Label>
                <Input
                  value={testCase.description}
                  onChange={(e) => updateTestCase(testCase.id, { description: e.target.value })}
                  placeholder="Описание теста"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label>Input (JSON объект с параметрами функции)</Label>
                <Textarea
                  value={JSON.stringify(testCase.input, null, 2)}
                  onChange={(e) => updateInput(testCase.id, e.target.value)}
                  placeholder='{"a": 5, "b": 3}'
                  rows={3}
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">
                  JSON объект, ключи должны соответствовать параметрам функции
                </p>
              </div>
              <div className="space-y-2">
                <Label>Expected Output</Label>
                <Textarea
                  value={
                    typeof testCase.expected_output === "string"
                      ? testCase.expected_output
                      : JSON.stringify(testCase.expected_output, null, 2)
                  }
                  onChange={(e) => updateExpectedOutput(testCase.id, e.target.value)}
                  placeholder='8 или "result" или [1, 2, 3]'
                  rows={2}
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">
                  Ожидаемый результат (может быть любым типом)
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Категория</Label>
                  <Select
                    value={testCase.category}
                    onValueChange={(v) =>
                      updateTestCase(testCase.id, {
                        category: v as "basic" | "edge" | "error",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Базовый</SelectItem>
                      <SelectItem value="edge">Граничный</SelectItem>
                      <SelectItem value="error">Ошибка</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    checked={testCase.is_visible}
                    onCheckedChange={(checked) =>
                      updateTestCase(testCase.id, { is_visible: checked })
                    }
                    disabled={disabled}
                  />
                  <Label>Видимый для ученика</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
