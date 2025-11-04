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
import { Sparkles, Loader2 } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="h-64 bg-muted animate-pulse" />,
});


interface TaskFormProps {
  moduleId?: string;
  taskId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type TestCase = {
  id: string;
  description: string;
  input: Record<string, unknown>;
  expected_output: unknown;
  category: "basic" | "edge" | "error";
  is_visible: boolean;
};

export function TaskForm({ moduleId, taskId, onSuccess, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [solutionCode, setSolutionCode] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [xpReward, setXpReward] = useState("10");
  const [orderIndex, setOrderIndex] = useState("0");
  const [currentModuleId, setCurrentModuleId] = useState(moduleId || "");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [rubric, setRubric] = useState<string>("\n[\n  { \"name\": \"Корректность\", \"weight\": 0.6, \"criteria\": \"Проходит базовые и граничные тесты\" },\n  { \"name\": \"Крайние случаи\", \"weight\": 0.2, \"criteria\": \"Учитывает пустые/некорректные входы, большие значения\" },\n  { \"name\": \"Стиль и читаемость\", \"weight\": 0.2, \"criteria\": \"Понятные имена, простота, отсутствие лишней сложности\" }\n]");
  const [evalPrompt, setEvalPrompt] = useState<string>(
    "Ты проверяешь решение ученика. Дай краткий отзыв (3-5 предложений) и числовую оценку 0..1 согласно rubric. Верни JSON {\\\"score\\\": number, \\\"feedback\\\": string}."
  );
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
      const typedData = data as {
        title: string;
        description: string;
        starter_code: string;
        solution_code: string | null;
        difficulty: "easy" | "medium" | "hard";
        xp_reward: number | null;
        order_index: number;
        module_id: string;
        test_cases: any;
      };
      setTitle(typedData.title);
      setDescription(typedData.description);
      setStarterCode(typedData.starter_code);
      setSolutionCode(typedData.solution_code || "");
      setDifficulty(typedData.difficulty);
      setXpReward(typedData.xp_reward?.toString() || "10");
      setOrderIndex(typedData.order_index.toString());
      setCurrentModuleId(typedData.module_id);

      // Парсим тестовые случаи
      try {
        const parsed = Array.isArray(typedData.test_cases) ? typedData.test_cases : [];
        setTestCases(parsed as TestCase[]);
      } catch {
        setTestCases([]);
      }
    }
  }

  async function handleGenerateAI() {
    if (!topic.trim()) {
      toast({
        title: "Ошибка",
        description: "Укажите тему задания для генерации",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);

    try {
      // Получаем теорию модуля (описание) для контекста
      let moduleTheory = "";
      if (currentModuleId) {
          const { data: moduleData } = await supabase
            .from("modules")
            .select("description")
            .eq("id", currentModuleId)
            .maybeSingle();
          const typedModuleData = moduleData as { description: string | null } | null;
          moduleTheory = typedModuleData?.description || "";
      }

      const response = await fetch("/api/ai/generate-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          difficulty,
          lessonTheory: moduleTheory,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Ошибка генерации");
      }

      if (result.data) {
        // Заполняем поля формы
        if (result.data.title) {
          setTitle(result.data.title);
        }
        if (result.data.description) {
          setDescription(result.data.description);
        }
        if (result.data.starter_code) {
          setStarterCode(result.data.starter_code);
        }
        if (result.data.solution_code) {
          setSolutionCode(result.data.solution_code);
        }
        if (result.data.test_cases && Array.isArray(result.data.test_cases)) {
          setTestCases(result.data.test_cases);
        }
        if (result.data.xp_reward) {
          setXpReward(result.data.xp_reward.toString());
        }
        if (result.data.rubric) {
          try {
            setRubric(JSON.stringify(result.data.rubric, null, 2));
          } catch {
            // игнорируем, если пришёл не-JSON
          }
        }
        if (result.data.eval_prompt) {
          setEvalPrompt(result.data.eval_prompt);
        }

        toast({
          title: "Успешно!",
          description: "Задание сгенерировано. Проверьте и при необходимости отредактируйте поля.",
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка генерации",
        description: error instanceof Error ? error.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
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
      module_id: currentModuleId,
    } as Database["public"]["Tables"]["tasks"]["Insert"];

    try {
      if (taskId) {
        const updateData = { ...taskData } as any;
        delete updateData.module_id; // модуль не меняем при редактировании
        const { error } = await (supabase.from("tasks") as any).update(updateData).eq("id", taskId);

        if (error) throw error;

        toast({
          title: "Задание обновлено",
          description: "Изменения сохранены",
        });
        onSuccess?.();
      } else {
        if (!currentModuleId) {
          throw new Error("Не указан модуль");
        }

        const { data, error } = await (supabase.from("tasks") as any).insert(taskData).select("id").single();

        if (error) throw error;

        toast({
          title: "Задание создано",
          description: "Новое задание успешно создано",
        });
        onSuccess?.();
        return;
      }
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
          <div className="flex items-center justify-between">
            <CardTitle>{taskId ? "Редактировать задание" : "Новое задание"}</CardTitle>
            {!taskId && (
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateAI}
                disabled={generating || loading}
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ИИ генерирует задание...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Сгенерировать с AI
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!taskId && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <Label htmlFor="topic">Тема задания для AI-генерации</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Например: сумма двух чисел, поиск максимума в списке"
                disabled={generating || loading}
              />
              <p className="text-xs text-muted-foreground">
                Укажите тему задания, и AI сгенерирует описание, код и тесты
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="rubric">Rubric (JSON, критерии и веса)</Label>
              <Textarea
                id="rubric"
                value={rubric}
                onChange={(e) => setRubric(e.target.value)}
                rows={8}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Рекомендуется сумма весов = 1. Используется ИИ для оценки качества решения.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="evalPrompt">Eval Prompt (шаблон для AI-оценки)</Label>
              <Textarea
                id="evalPrompt"
                value={evalPrompt}
                onChange={(e) => setEvalPrompt(e.target.value)}
                rows={8}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Краткая инструкция для модели как оценивать решение. Должна быть стабильной и выводить JSON.</p>
            </div>
          </div>
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
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onCancel ? onCancel() : router.back()} 
            disabled={loading}
          >
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
