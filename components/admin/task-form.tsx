"use client";

import { TestCasesEditor } from "@/components/admin/test-cases-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="h-64 bg-muted animate-pulse" />,
});


interface TaskFormProps {
  lessonId?: string;
  taskId?: string;
}

type TestCase = {
  id: string;
  description: string;
  input: Record<string, unknown>;
  expected_output: unknown;
  category: "basic" | "edge" | "error";
  is_visible: boolean;
};

export function TaskForm({ lessonId, taskId }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [solutionCode, setSolutionCode] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [xpReward, setXpReward] = useState("10");
  const [orderIndex, setOrderIndex] = useState("0");
  const [currentLessonId, setCurrentLessonId] = useState(lessonId || "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    if (taskId) {
      loadTask();
    }
  }, [taskId]);

  async function loadTask() {
    if (!taskId) return;

    const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).single();

    if (error) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setTitle(data.title);
      setDescription(data.description);
      setStarterCode(data.starter_code);
      setSolutionCode(data.solution_code || "");
      setDifficulty(data.difficulty);
      setXpReward(data.xp_reward?.toString() || "10");
      setOrderIndex(data.order_index.toString());
      setCurrentLessonId(data.lesson_id);

      // Парсим тестовые случаи
      try {
        const parsed = Array.isArray(data.test_cases) ? data.test_cases : [];
        setTestCases(parsed as TestCase[]);
      } catch {
        setTestCases([]);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Валидация тестов
    if (testCases.length === 0) {
      toast({
        title: "Ошибка",
        description: "Добавьте хотя бы один тестовый случай",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const taskData = {
      title,
      description,
      starter_code: starterCode,
      solution_code: solutionCode || null,
      test_cases: testCases,
      difficulty,
      xp_reward: Number.parseInt(xpReward),
      order_index: Number.parseInt(orderIndex),
    };

    try {
      if (taskId) {
        const { error } = await supabase.from("tasks").update(taskData).eq("id", taskId);

        if (error) throw error;

        toast({
          title: "Задание обновлено",
          description: "Изменения сохранены",
        });
      } else {
        if (!currentLessonId) {
          throw new Error("Не указан урок");
        }

        const { error } = await supabase.from("tasks").insert({
          ...taskData,
          lesson_id: currentLessonId,
        });

        if (error) throw error;

        toast({
          title: "Задание создано",
          description: "Новое задание успешно создано",
        });
      }

      router.push(`/admin/lessons/${currentLessonId}/tasks`);
      router.refresh();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>{taskId ? "Редактировать задание" : "Новое задание"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Название *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Описание *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="starterCode">Стартовый код *</Label>
            <MonacoEditor
              height="300px"
              language="python"
              theme="vs-dark"
              value={starterCode}
              onChange={(value) => setStarterCode(value || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: "on",
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="solutionCode">Правильное решение (опционально)</Label>
            <MonacoEditor
              height="200px"
              language="python"
              theme="vs-dark"
              value={solutionCode}
              onChange={(value) => setSolutionCode(value || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: "on",
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Тестовые случаи *</Label>
            <TestCasesEditor testCases={testCases} onChange={setTestCases} disabled={loading} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty">Сложность *</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as "easy" | "medium" | "hard")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Легкое</SelectItem>
                  <SelectItem value="medium">Среднее</SelectItem>
                  <SelectItem value="hard">Сложное</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="xpReward">XP награда *</Label>
              <Input
                id="xpReward"
                type="number"
                value={xpReward}
                onChange={(e) => setXpReward(e.target.value)}
                required
                min="1"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderIndex">Порядок *</Label>
              <Input
                id="orderIndex"
                type="number"
                value={orderIndex}
                onChange={(e) => setOrderIndex(e.target.value)}
                required
                min="0"
                disabled={loading}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
            Отмена
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Сохранение..." : taskId ? "Сохранить" : "Создать"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
