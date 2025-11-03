"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";


interface ModuleFormProps {
  moduleId?: string;
  initialData?: Database["public"]["Tables"]["modules"]["Row"];
  createdByUserId?: string;
}

export function ModuleForm({ moduleId, initialData, createdByUserId }: ModuleFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("1");
  const [orderIndex, setOrderIndex] = useState("0");
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("module");
  const [taskGenLoading, setTaskGenLoading] = useState(false);
  const [taskGenDifficulty, setTaskGenDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [generatedTask, setGeneratedTask] = useState<any | null>(null);
  // Сущности уроков больше нет — задания сохраняются напрямую в модуль

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setTopic(initialData.topic || "");
      setLevel(String(initialData.level ?? "1"));
      setOrderIndex(String(initialData.order_index ?? "0"));
      setIsPublished(Boolean(initialData.is_published));
      setLoading(false);
      return;
    }
    if (moduleId) {
      loadModule();
    }
  }, [moduleId, initialData]);

  async function loadModule() {
    if (!moduleId) return;

    const { data, error } = await supabase.from("modules").select("*").eq("id", moduleId).single();

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
      setDescription(data.description || "");
      setTopic(data.topic);
      setLevel(data.level.toString());
      setOrderIndex(data.order_index.toString());
      setIsPublished(data.is_published ?? false);
    }
  }

  async function handleGenerateAI() {
    if (!topic.trim()) {
      toast({
        title: "Ошибка",
        description: "Укажите тему для генерации",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch("/api/ai/generate-module", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          level,
          description: description || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Ошибка генерации");
      }

      if (result.data) {
        // Автоматически заполняем название из темы
        if (topic && !title) {
          setTitle(topic);
        }

        // Формируем описание с теорией и примерами в markdown формате
        let generatedDescription = "";
        
        // Добавляем основное описание
        if (result.data.description) {
          generatedDescription += result.data.description + "\n\n";
        }

        // Добавляем теорию
        if (result.data.theory) {
          const theory = result.data.theory;
          
          if (theory.introduction) {
            generatedDescription += "## Введение\n\n" + theory.introduction + "\n\n";
          }

          if (theory.sections && Array.isArray(theory.sections)) {
            theory.sections.forEach((section: any) => {
              if (section.heading) {
                generatedDescription += `## ${section.heading}\n\n`;
              }
              if (section.content) {
                generatedDescription += section.content + "\n\n";
              }
              
              // Добавляем примеры кода
              if (section.code_examples && Array.isArray(section.code_examples)) {
                section.code_examples.forEach((example: any) => {
                  if (example.description) {
                    generatedDescription += `### ${example.description}\n\n`;
                  }
                  if (example.code) {
                    generatedDescription += "```python\n" + example.code + "\n```\n\n";
                  }
                  if (example.output) {
                    generatedDescription += `**Вывод:**\n\`\`\`\n${example.output}\n\`\`\`\n\n`;
                  }
                  if (example.explanation) {
                    generatedDescription += `*${example.explanation}*\n\n`;
                  }
                });
              }
            });
          }

          if (theory.summary) {
            generatedDescription += "## Резюме\n\n" + theory.summary + "\n\n";
          }

          if (theory.key_concepts && Array.isArray(theory.key_concepts)) {
            generatedDescription += "## Ключевые концепции\n\n";
            theory.key_concepts.forEach((concept: string) => {
              generatedDescription += `- ${concept}\n`;
            });
            generatedDescription += "\n";
          }
        }

        if (generatedDescription && !description) {
          setDescription(generatedDescription.trim());
        }

        toast({
          title: "Модуль сгенерирован",
          description: "Поля заполнены автоматически. Проверьте и нажмите Сохранить.",
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

  async function handleGenerateTaskAI() {
    if (!topic.trim()) {
      toast({ title: "Ошибка", description: "Укажите тему модуля — она используется как тема задания", variant: "destructive" });
      return;
    }
    setTaskGenLoading(true);
    try {
      const response = await fetch("/api/ai/generate-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          difficulty: taskGenDifficulty,
          lessonTheory: description || "",
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Ошибка генерации задания");
      }
      setGeneratedTask(result.data || null);
      toast({ title: "Задание сгенерировано", description: "Проверьте и используйте в форме задания" });
    } catch (e) {
      toast({ title: "Ошибка генерации", description: e instanceof Error ? e.message : "Неизвестная ошибка", variant: "destructive" });
    } finally {
      setTaskGenLoading(false);
    }
  }

  function copyGeneratedField(_value: string) {}

  async function handleCreateTaskFromGenerated() {
    if (!moduleId) {
      toast({ title: "Сначала сохраните модуль", description: "Создайте модуль, затем добавьте в него задания", variant: "destructive" });
      return;
    }
    if (!generatedTask) {
      toast({ title: "Нет данных задания", description: "Сгенерируйте задание перед сохранением", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        title: generatedTask.title || "",
        description: generatedTask.description || "",
        starter_code: generatedTask.starter_code || "",
        solution_code: generatedTask.solution_code || null,
        test_cases: Array.isArray(generatedTask.test_cases) ? generatedTask.test_cases : [],
        difficulty: taskGenDifficulty,
        xp_reward: generatedTask.xp_reward ?? (taskGenDifficulty === "easy" ? 10 : taskGenDifficulty === "medium" ? 20 : 30),
        order_index: 0,
      };

      const res = await fetch(`/api/admin/modules/${moduleId}/tasks/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = (body as any)?.error || `${res.status} ${res.statusText}`;
        const details = (body as any)?.details;
        const mid = (body as any)?.moduleId || moduleId;
        const fullMsg = `${msg}${details ? ` — ${details}` : ""} [module_id=${mid}]`;
        toast({
          title: "Ошибка",
          description: fullMsg,
          variant: "destructive",
          action: (
            <ToastAction altText="Скопировать" onClick={() => navigator.clipboard.writeText(fullMsg)}>
              Скопировать
            </ToastAction>
          ),
        });
        return;
      }
      const { id: newId } = await res.json();
      toast({ title: "Задание создано", description: "Задание добавлено в модуль" });
      if (newId) {
        router.push(`/admin/tasks/${newId}/edit`);
      } else {
        // Если RLS не позволяет выбирать только что созданную запись, отправляем в список задач админки
        router.push(`/admin/tasks`);
      }
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Неизвестная ошибка";
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
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("ModuleForm: handleSubmit start", { title, topic, level, orderIndex, isPublished });
    setLoading(true);

    // Явная валидация, чтобы не блокировала скрытая секция аккордеона
    if (!title.trim()) {
      setLoading(false);
      toast({ title: "Название обязательно", description: "Заполните поле 'Название' перед сохранением", variant: "destructive" });
      return;
    }
    if (!topic.trim()) {
      setLoading(false);
      toast({ title: "Тема обязательна", description: "Заполните поле 'Тема' перед сохранением", variant: "destructive" });
      return;
    }

    // Санитизация описания на случай скрытых управляющих символов из AI
    const sanitizedDescription = (description || "").replace(/[\u0000\u2028\u2029]/g, "");
    const descLength = sanitizedDescription.length;
    const nonAsciiCount = (sanitizedDescription.match(/[^\x00-\x7F]/g) || []).length;
    console.log("ModuleForm: description stats", { descLength, nonAsciiCount, sample: sanitizedDescription.slice(0, 200) });

    const parsedLevel = Number.parseInt(level, 10);
    const parsedOrder = Number.parseInt(orderIndex, 10);
    const levelValue = Number.isNaN(parsedLevel) && initialData ? initialData.level : parsedLevel;
    const orderValue = Number.isNaN(parsedOrder) && initialData ? initialData.order_index : parsedOrder;

    const moduleData = {
      title,
      description: sanitizedDescription || null,
      topic,
      level: levelValue,
      order_index: orderValue,
      is_published: isPublished,
    };

    try {
      console.log("ModuleForm: before save, moduleId=", moduleId);
      if (moduleId) {
        console.log("ModuleForm: updating module via API", { moduleId, level: moduleData.level, order_index: moduleData.order_index, title: moduleData.title, topic: moduleData.topic, descLength });
        console.time("ModuleForm:updateDuration");
        const res = await fetch(`/api/admin/modules/${moduleId}/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(moduleData),
        });
        console.timeEnd("ModuleForm:updateDuration");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg = (body as any)?.error || `${res.status} ${res.statusText}`;
          throw new Error(`Ошибка обновления модуля: ${msg}`);
        }
        console.log("ModuleForm: update done");
        toast({
          title: "Модуль обновлен",
          description: "Изменения сохранены в базе данных",
        });
      } else {
        if (!createdByUserId) {
          throw new Error("Не удалось определить пользователя для поля created_by");
        }

        console.log("Creating module with data (stats only):", { level: moduleData.level, order_index: moduleData.order_index, title: moduleData.title, topic: moduleData.topic, descLength, createdByUserId });

        console.log("ModuleForm: inserting module via API...");
        console.time("ModuleForm:insertDuration");
        const res = await fetch("/api/admin/modules/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...moduleData, created_by: createdByUserId }),
        });
        console.timeEnd("ModuleForm:insertDuration");

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg = (body as any)?.error || `${res.status} ${res.statusText}`;
          throw new Error(`Ошибка создания модуля: ${msg}`);
        }

        const data = await res.json();
        console.log("Module created successfully", { id: data?.id, title: data?.title });

        toast({
          title: "Модуль создан",
          description: `Модуль "${moduleData.title}" успешно сохранен в базе данных`,
        });
      }

      router.push("/admin/modules");
      router.refresh();
    } catch (error) {
      console.error("Error creating/updating module:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Неизвестная ошибка. Проверьте консоль для деталей.";
      toast({
        title: "Ошибка",
        description: errorMessage,
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
          <CardTitle>{moduleId ? "Редактировать модуль" : "Новый модуль"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Поле Название вынесено наружу */}
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
          <Tabs defaultValue="module" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="module">Данные модуля</TabsTrigger>
              <TabsTrigger value="ai">Генерация заданий ИИ</TabsTrigger>
            </TabsList>

            <TabsContent value="module" className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="description">
                  <AccordionTrigger>Описание</AccordionTrigger>
                  <AccordionContent>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={loading}
                      className="min-h-[500px] font-ubuntu-mono text-sm"
                      placeholder="Введите описание в формате Markdown..."
                    />
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="preview">
                  <AccordionTrigger>Предпросмотр</AccordionTrigger>
                  <AccordionContent>
                    <div className="border rounded-md p-4 h-[500px] overflow-auto bg-card font-ubuntu-mono text-sm">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {description || "*Введите текст выше для предпросмотра*"}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="topic">Тема *</Label>
                  {!moduleId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateAI}
                      disabled={loading || generating || !topic.trim()}
                    >
                      {generating ? "Генерация..." : "🎨 Сгенерировать с AI"}
                    </Button>
                  )}
                </div>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    if (!title && e.target.value.trim()) {
                      setTitle(e.target.value.trim());
                    }
                  }}
                  placeholder="Например: Переменные, Циклы, Функции"
                  required
                  disabled={loading || generating}
                />
                {generating && (
                  <p className="text-sm text-muted-foreground">ИИ генерирует контент модуля... Это может занять несколько секунд.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Уровень сложности (1-5) *</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите уровень" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Начальный</SelectItem>
                      <SelectItem value="2">2 - Базовый</SelectItem>
                      <SelectItem value="3">3 - Средний</SelectItem>
                      <SelectItem value="4">4 - Продвинутый</SelectItem>
                      <SelectItem value="5">5 - Эксперт</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orderIndex">Порядок отображения *</Label>
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

              <div className="flex items-center space-x-2">
                <Switch id="isPublished" checked={isPublished} onCheckedChange={setIsPublished} disabled={loading} />
                <Label htmlFor="isPublished">Опубликован</Label>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Сложность задания для генерации</Label>
                  <Select value={taskGenDifficulty} onValueChange={(v) => setTaskGenDifficulty(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Легкая</SelectItem>
                      <SelectItem value="medium">Средняя</SelectItem>
                      <SelectItem value="hard">Сложная</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Будет использована тема модуля и его теория как контекст</p>
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={handleGenerateTaskAI} disabled={taskGenLoading} className="w-full">
                    {taskGenLoading ? "Генерация..." : "⚙️ Сгенерировать задание"}
                  </Button>
                </div>
              </div>

              {moduleId && (
                <div className="flex items-end">
                  <Button type="button" variant="secondary" onClick={handleCreateTaskFromGenerated} disabled={!generatedTask} className="w-full">
                    Сохранить задание
                  </Button>
                </div>
              )}

              {generatedTask && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Название</Label>
                    <Input readOnly value={generatedTask.title || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label>Описание (Markdown)</Label>
                    <Textarea readOnly rows={8} value={generatedTask.description || ""} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Starter code</Label>
                      <Textarea readOnly rows={8} value={generatedTask.starter_code || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label>Solution code</Label>
                      <Textarea readOnly rows={8} value={generatedTask.solution_code || ""} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Rubric (JSON)</Label>
                    <Textarea readOnly rows={6} value={JSON.stringify(generatedTask.rubric ?? [], null, 2)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Eval Prompt</Label>
                    <Textarea readOnly rows={4} value={generatedTask.eval_prompt || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label>Тестовые случаи (JSON)</Label>
                    <Textarea readOnly rows={8} value={JSON.stringify(generatedTask.test_cases ?? [], null, 2)} />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
            Отмена
          </Button>
          {moduleId && (
            <Button
              type="button"
              variant="destructive"
              disabled={loading}
              onClick={() => setConfirmOpen(true)}
            >
              Удалить
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Сохранение..." : moduleId ? "Сохранить" : "Создать"}
          </Button>
        </CardFooter>

        {moduleId && (
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-destructive/10 p-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <DialogTitle>Удалить модуль?</DialogTitle>
                    <DialogDescription>
                      Вы действительно хотите удалить этот модуль? Это действие нельзя отменить.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <DialogFooter className="sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>Отмена</Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    if (!moduleId) return;
                    const res = await fetch(`/api/admin/modules/${moduleId}/delete`, { method: "POST" });
                    setConfirmOpen(false);
                    if (!res.ok) {
                      const body = await res.json().catch(() => ({}));
                      const msg = (body as any)?.error || `${res.status} ${res.statusText}`;
                      toast({ title: "Ошибка удаления", description: msg, variant: "destructive" });
                      return;
                    }
                    toast({ title: "Модуль удалён", description: "Модуль успешно удалён из базы" });
                    router.push("/admin/modules");
                    router.refresh();
                  }}
                >
                  Удалить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </form>
    </Card>
  );
}
