"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { ModuleTasksManager } from "@/components/admin/module-tasks-manager";
import { useTheme } from "@/components/theme-provider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import type { Module } from "@/types/db";

interface ModuleFormProps {
  moduleId?: string;
  initialData?: Module;
  createdByUserId?: string;
}

interface GeneratedTask {
  title?: string;
  description?: string;
  starter_code?: string;
  solution_code?: string | null;
  test_cases?: unknown;
  xp_reward?: number;
}

interface GeneratedCodeExample {
  description?: string;
  code?: string;
  output?: string;
  explanation?: string;
}

interface GeneratedTheorySection {
  heading?: string;
  content?: string;
  code_examples?: GeneratedCodeExample[];
}

interface GeneratedTheory {
  introduction?: string;
  sections?: GeneratedTheorySection[];
  summary?: string;
  key_concepts?: string[];
}

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error || `${response.status} ${response.statusText}`;
}

export function ModuleForm({ moduleId, initialData }: ModuleFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("1");
  const [orderIndex, setOrderIndex] = useState("0");
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("module");
  const [taskGenLoading, setTaskGenLoading] = useState(false);
  const [taskGenDifficulty, setTaskGenDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [generatedTask, setGeneratedTask] = useState<GeneratedTask | null>(null);
  const [newTaskId, setNewTaskId] = useState<string | null>(null);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  // Состояние для текущего выбранного модуля (может отличаться от moduleId из URL)
  // Всегда инициализируем из moduleId, если он есть
  const [currentModuleId, setCurrentModuleId] = useState<string | undefined>(moduleId || undefined);

  useEffect(() => {
    setMounted(true);
  }, []);
  // Сущности уроков больше нет — задания сохраняются напрямую в модуль

  // Инициализируем currentModuleId при изменении moduleId из пропсов
  useEffect(() => {
    setCurrentModuleId(moduleId);
  }, [moduleId]);

  // Загружаем список всех модулей для дропдауна (только если редактируем модуль)
  // biome-ignore lint/correctness/useExhaustiveDependencies: загрузка нужна только при изменении moduleId
  useEffect(() => {
    if (moduleId) {
      loadAllModules();
    }
  }, [moduleId]);

  async function loadAllModules() {
    setModulesLoading(true);
    try {
      const res = await fetch("/api/admin/modules", { credentials: "include" });
      if (!res.ok) {
        throw new Error(await readApiError(res));
      }
      const body = (await res.json()) as { modules?: Module[] };
      setAllModules(body.modules ?? []);
    } catch (error) {
      console.error("Error loading modules:", error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось загрузить список модулей",
        variant: "destructive",
      });
    } finally {
      setModulesLoading(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: выбор модуля управляет загрузкой полей
  useEffect(() => {
    if (initialData && currentModuleId === moduleId) {
      // Используем initialData только при первой загрузке (когда currentModuleId совпадает с moduleId из URL)
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setTopic(initialData.topic || "");
      setLevel(String(initialData.level ?? "1"));
      setOrderIndex(String(initialData.order_index ?? "0"));
      setIsPublished(Boolean(initialData.is_published));
      setLoading(false);
      return;
    }
    if (currentModuleId && currentModuleId !== moduleId) {
      // Если currentModuleId отличается от moduleId из URL, загружаем данные нового модуля
      loadModule(currentModuleId);
    } else if (currentModuleId && !initialData) {
      // Если нет initialData, загружаем модуль
      loadModule(currentModuleId);
    }
  }, [currentModuleId, initialData, moduleId]);

  async function loadModule(moduleIdToLoad?: string) {
    const targetModuleId = moduleIdToLoad || currentModuleId;
    if (!targetModuleId) return;

    try {
      const res = await fetch(`/api/admin/modules/${targetModuleId}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      const body = (await res.json()) as { module?: Module };
      const data = body.module;
      if (!data) {
        throw new Error("Модуль не найден");
      }

      setTitle(data.title);
      setDescription(data.description || "");
      setTopic(data.topic);
      setLevel(String(data.level ?? 1));
      setOrderIndex(String(data.order_index ?? 0));
      setIsPublished(Boolean(data.is_published));
    } catch (error) {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось загрузить модуль",
        variant: "destructive",
      });
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
          generatedDescription += `${result.data.description}\n\n`;
        }

        // Добавляем теорию
        if (result.data.theory) {
          const theory = result.data.theory as GeneratedTheory;

          if (theory.introduction) {
            generatedDescription += `## Введение\n\n${theory.introduction}\n\n`;
          }

          if (theory.sections && Array.isArray(theory.sections)) {
            theory.sections.forEach((section) => {
              if (section.heading) {
                generatedDescription += `## ${section.heading}\n\n`;
              }
              if (section.content) {
                generatedDescription += `${section.content}\n\n`;
              }

              // Добавляем примеры кода
              if (section.code_examples && Array.isArray(section.code_examples)) {
                section.code_examples.forEach((example) => {
                  if (example.description) {
                    generatedDescription += `### ${example.description}\n\n`;
                  }
                  if (example.code) {
                    generatedDescription += `\`\`\`python\n${example.code}\n\`\`\`\n\n`;
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
            generatedDescription += `## Резюме\n\n${theory.summary}\n\n`;
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
      toast({
        title: "Ошибка",
        description: "Укажите тему модуля — она используется как тема задания",
        variant: "destructive",
      });
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
      toast({
        title: "Задание сгенерировано",
        description: "Проверьте и используйте в форме задания",
      });
    } catch (e) {
      toast({
        title: "Ошибка генерации",
        description: e instanceof Error ? e.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setTaskGenLoading(false);
    }
  }

  async function handleCreateTaskFromGenerated() {
    const targetModuleId = currentModuleId || moduleId;
    if (!targetModuleId) {
      toast({
        title: "Сначала сохраните модуль",
        description: "Создайте модуль, затем добавьте в него задания",
        variant: "destructive",
      });
      return;
    }
    if (!generatedTask) {
      toast({
        title: "Нет данных задания",
        description: "Сгенерируйте задание перед сохранением",
        variant: "destructive",
      });
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
        xp_reward:
          generatedTask.xp_reward ??
          (taskGenDifficulty === "easy" ? 10 : taskGenDifficulty === "medium" ? 20 : 30),
        order_index: 0,
      };

      const res = await fetch(`/api/admin/modules/${targetModuleId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await readApiError(res);
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
      const body = (await res.json()) as { task?: { id?: string } };
      const newId = body.task?.id;
      if (newId) {
        setNewTaskId(newId);
        setGeneratedTask(null);
        // Переключаемся на вкладку заданий и обновляем список
        setActiveTab("tasks");
        // Небольшая задержка для обновления списка заданий
        setTimeout(() => {
          router.refresh();
        }, 200);
        toast({
          title: "Задание создано",
          description: "Задание добавлено в модуль и открыто для редактирования",
        });
      } else {
        toast({
          title: "Предупреждение",
          description: "Задание создано, но не удалось получить его ID. Обновите страницу.",
          variant: "destructive",
        });
      }
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
      toast({
        title: "Название обязательно",
        description: "Заполните поле 'Название' перед сохранением",
        variant: "destructive",
      });
      return;
    }
    if (!topic.trim()) {
      setLoading(false);
      toast({
        title: "Тема обязательна",
        description: "Заполните поле 'Тема' перед сохранением",
        variant: "destructive",
      });
      return;
    }

    // Санитизация описания на случай скрытых управляющих символов из AI
    const sanitizedDescription = (description || "")
      .replaceAll("\u0000", "")
      .replaceAll("\u2028", "")
      .replaceAll("\u2029", "");
    const descLength = sanitizedDescription.length;
    const nonAsciiCount = Array.from(sanitizedDescription).filter(
      (char) => char.charCodeAt(0) > 127
    ).length;
    console.log("ModuleForm: description stats", {
      descLength,
      nonAsciiCount,
      sample: sanitizedDescription.slice(0, 200),
    });

    const parsedLevel = Number.parseInt(level, 10);
    const parsedOrder = Number.parseInt(orderIndex, 10);
    const levelValue = Number.isNaN(parsedLevel) && initialData ? initialData.level : parsedLevel;
    const orderValue =
      Number.isNaN(parsedOrder) && initialData ? initialData.order_index : parsedOrder;

    const moduleData = {
      title,
      description: sanitizedDescription || null,
      topic,
      level: levelValue,
      order_index: orderValue,
      is_published: isPublished,
    };

    try {
      const targetModuleId = currentModuleId || moduleId;
      console.log("ModuleForm: before save, moduleId=", targetModuleId);
      if (targetModuleId) {
        console.log("ModuleForm: updating module via API", {
          moduleId: targetModuleId,
          level: moduleData.level,
          order_index: moduleData.order_index,
          title: moduleData.title,
          topic: moduleData.topic,
          descLength,
        });
        console.time("ModuleForm:updateDuration");
        const res = await fetch(`/api/admin/modules/${targetModuleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(moduleData),
        });
        console.timeEnd("ModuleForm:updateDuration");
        if (!res.ok) {
          const msg = await readApiError(res);
          throw new Error(`Ошибка обновления модуля: ${msg}`);
        }
        console.log("ModuleForm: update done");
        toast({
          title: "Модуль обновлен",
          description: "Изменения сохранены в базе данных",
        });
      } else {
        console.log("Creating module with data (stats only):", {
          level: moduleData.level,
          order_index: moduleData.order_index,
          title: moduleData.title,
          topic: moduleData.topic,
          descLength,
        });

        console.log("ModuleForm: inserting module via API...");
        console.time("ModuleForm:insertDuration");
        const res = await fetch("/api/admin/modules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(moduleData),
        });
        console.timeEnd("ModuleForm:insertDuration");

        if (!res.ok) {
          const msg = await readApiError(res);
          throw new Error(`Ошибка создания модуля: ${msg}`);
        }

        const body = (await res.json()) as { module?: Module };
        console.log("Module created successfully", {
          id: body.module?.id,
          title: body.module?.title,
        });

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
    <>
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>{moduleId ? "" : ""}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Выбор модуля для редактирования (только если редактируем) */}
            {moduleId && (
              <div className="space-y-2">
                <Label htmlFor="module-select">Выберите модуль для редактирования *</Label>
                <Select
                  value={currentModuleId || ""}
                  onValueChange={async (value) => {
                    // Обновляем текущий модуль без редиректа
                    setCurrentModuleId(value);
                    // Загружаем данные выбранного модуля
                    await loadModule(value);
                    // Обновляем URL без перезагрузки страницы
                    router.replace(`/admin/modules/${value}/edit`, { scroll: false });
                    // Компонент ModuleTasksManager автоматически перезагрузится благодаря изменению key
                    // который включает currentModuleId
                  }}
                  disabled={loading || modulesLoading}
                >
                  <SelectTrigger id="module-select">
                    <SelectValue placeholder="Выберите модуль" />
                  </SelectTrigger>
                  <SelectContent>
                    {allModules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.topic || module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Поле Название (только если создаем новый модуль) */}
            {!moduleId && (
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
            )}
            <Tabs
              defaultValue="module"
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value);
                // При переключении на вкладку "Задания" убеждаемся, что currentModuleId установлен
                if (value === "tasks" && !currentModuleId && moduleId) {
                  setCurrentModuleId(moduleId);
                }
              }}
            >
              <TabsList>
                <TabsTrigger value="module">Данные модуля</TabsTrigger>
                {(currentModuleId || moduleId) && <TabsTrigger value="tasks">Задания</TabsTrigger>}
                <TabsTrigger value="ai">Генерация заданий с AI</TabsTrigger>
              </TabsList>

              <TabsContent value="module" className="space-y-6">
                {/* Основные параметры */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-card rounded-lg border">
                  <div className="space-y-2">
                    <Label htmlFor="topic">Тема *</Label>
                    <Input
                      id="topic"
                      value={topic}
                      onChange={(e) => {
                        const newTopic = e.target.value;
                        setTopic(newTopic);
                        // Автоматически заполняем название из темы, если название пустое
                        // или если название совпадает с предыдущим значением темы (было заполнено автоматически)
                        if (newTopic.trim()) {
                          if (!title || title === topic.trim()) {
                            setTitle(newTopic.trim());
                          }
                        }
                      }}
                      placeholder="Например: Переменные, Циклы, Функции"
                      required
                      disabled={loading || generating}
                    />
                    {generating && (
                      <p className="text-xs text-muted-foreground">
                        ИИ генерирует контент модуля...
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="level">Уровень (1-5) *</Label>
                      <Select value={level} onValueChange={setLevel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Уровень" />
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
                  <div className="md:col-span-2 flex items-center space-x-2 p-2 bg-muted/50 rounded-md">
                    <Switch
                      id="isPublished"
                      checked={isPublished}
                      onCheckedChange={setIsPublished}
                      disabled={loading}
                    />
                    <Label htmlFor="isPublished" className="cursor-pointer">
                      Опубликован
                    </Label>
                  </div>
                </div>

                {/* Описание модуля */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Описание модуля (Markdown)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="description" className="border-none">
                        <AccordionTrigger className="py-2 text-sm">
                          Редактировать описание
                        </AccordionTrigger>
                        <AccordionContent>
                          <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                            className="min-h-[300px] font-ubuntu-mono text-sm"
                            placeholder="Введите описание в формате Markdown..."
                          />
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="preview" className="border-none">
                        <AccordionTrigger className="py-2 text-sm">Предпросмотр</AccordionTrigger>
                        <AccordionContent>
                          <div className="border rounded-md p-4 h-[400px] overflow-auto bg-card font-ubuntu-mono">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                components={{
                                  code(props) {
                                    const {
                                      node: _node,
                                      className,
                                      children,
                                      style: _style,
                                      ...rest
                                    } = props;
                                    const inline = !className?.includes("language-");
                                    const match = /language-(\w+)/.exec(className || "");
                                    const isDark =
                                      mounted &&
                                      (theme === "dark" ||
                                        (theme === "system" &&
                                          typeof window !== "undefined" &&
                                          window.matchMedia("(prefers-color-scheme: dark)")
                                            .matches));
                                    return !inline && match ? (
                                      <SyntaxHighlighter
                                        style={isDark ? oneDark : oneLight}
                                        language={match[1]}
                                        PreTag="div"
                                        className="font-ubuntu-mono rounded-md"
                                        customStyle={{ fontFamily: "Ubuntu Mono, monospace" }}
                                        {...(rest as any)}
                                      >
                                        {String(children).replace(/\n$/, "")}
                                      </SyntaxHighlighter>
                                    ) : (
                                      <code
                                        className={`font-ubuntu-mono ${className}`}
                                        {...(rest as any)}
                                      >
                                        {children}
                                      </code>
                                    );
                                  },
                                  p: ({ children }) => (
                                    <p className="mb-4 last:mb-0 whitespace-pre-line font-ubuntu-mono">
                                      {children}
                                    </p>
                                  ),
                                  h1: ({ children }) => (
                                    <h1 className="mb-4 font-ubuntu-mono">{children}</h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="mb-3 font-ubuntu-mono">{children}</h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="mb-2 font-ubuntu-mono">{children}</h3>
                                  ),
                                  li: ({ children }) => (
                                    <li className="font-ubuntu-mono">{children}</li>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="font-ubuntu-mono">{children}</strong>
                                  ),
                                  em: ({ children }) => (
                                    <em className="font-ubuntu-mono">{children}</em>
                                  ),
                                }}
                              >
                                {description || "*Введите текст выше для предпросмотра*"}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ai" className="space-y-6">
                <div className="space-y-3">
                  <Label>Сложность задания</Label>
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <div className="w-full sm:w-48">
                      <Select
                        value={taskGenDifficulty}
                        onValueChange={(v) => setTaskGenDifficulty(v as "easy" | "medium" | "hard")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Легкая</SelectItem>
                          <SelectItem value="medium">Средняя</SelectItem>
                          <SelectItem value="hard">Сложная</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerateTaskAI}
                        disabled={taskGenLoading}
                        className="flex-1 sm:flex-initial"
                      >
                        {taskGenLoading ? "Генерация..." : "🎨 Сгенерировать"}
                      </Button>
                      {currentModuleId && (
                        <Button
                          type="button"
                          variant="default"
                          onClick={handleCreateTaskFromGenerated}
                          disabled={!generatedTask}
                          className="flex-1 sm:flex-initial"
                        >
                          Сохранить
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Будет использована тема модуля и его теория как контекст
                  </p>
                </div>

                {generatedTask && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Название</Label>
                      <Input readOnly value={generatedTask.title || ""} />
                    </div>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Описание (Markdown)</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="description" className="border-none">
                            <AccordionTrigger className="py-2 text-sm">
                              Редактировать описание
                            </AccordionTrigger>
                            <AccordionContent>
                              <Textarea
                                readOnly
                                value={generatedTask.description || ""}
                                className="min-h-[300px] font-ubuntu-mono text-sm"
                              />
                            </AccordionContent>
                          </AccordionItem>
                          <AccordionItem value="preview" className="border-none">
                            <AccordionTrigger className="py-2 text-sm">
                              Предпросмотр
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="border rounded-md p-4 h-[400px] overflow-auto bg-card font-ubuntu-mono">
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkBreaks]}
                                    components={{
                                      code({ node: _node, className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(className || "");
                                        const isDark =
                                          mounted &&
                                          (theme === "dark" ||
                                            (theme === "system" &&
                                              typeof window !== "undefined" &&
                                              window.matchMedia("(prefers-color-scheme: dark)")
                                                .matches));
                                        const inline = (props as { inline?: boolean }).inline;
                                        return !inline && match ? (
                                          <SyntaxHighlighter
                                            style={isDark ? oneDark : oneLight}
                                            language={match[1]}
                                            PreTag="div"
                                            className="font-ubuntu-mono rounded-md"
                                            customStyle={{ fontFamily: "Ubuntu Mono, monospace" }}
                                          >
                                            {String(children).replace(/\n$/, "")}
                                          </SyntaxHighlighter>
                                        ) : (
                                          <code
                                            className={`font-ubuntu-mono ${className}`}
                                            {...props}
                                          >
                                            {children}
                                          </code>
                                        );
                                      },
                                      p: ({ children }) => (
                                        <p className="mb-4 last:mb-0 whitespace-pre-line font-ubuntu-mono">
                                          {children}
                                        </p>
                                      ),
                                      h1: ({ children }) => (
                                        <h1 className="mb-4 font-ubuntu-mono">{children}</h1>
                                      ),
                                      h2: ({ children }) => (
                                        <h2 className="mb-3 font-ubuntu-mono">{children}</h2>
                                      ),
                                      h3: ({ children }) => (
                                        <h3 className="mb-2 font-ubuntu-mono">{children}</h3>
                                      ),
                                      li: ({ children }) => (
                                        <li className="font-ubuntu-mono">{children}</li>
                                      ),
                                      strong: ({ children }) => (
                                        <strong className="font-ubuntu-mono">{children}</strong>
                                      ),
                                      em: ({ children }) => (
                                        <em className="font-ubuntu-mono">{children}</em>
                                      ),
                                    }}
                                  >
                                    {generatedTask.description || "*Описание отсутствует*"}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </CardContent>
                    </Card>
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
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Отмена
            </Button>
            {!moduleId && (
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateAI}
                disabled={loading || generating || !topic.trim()}
              >
                {generating ? "Генерация..." : "🎨 Сгенерировать с AI"}
              </Button>
            )}
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
                  <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                    Отмена
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={async () => {
                      const targetModuleId = currentModuleId || moduleId;
                      if (!targetModuleId) return;
                      const res = await fetch(`/api/admin/modules/${targetModuleId}`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                      });
                      setConfirmOpen(false);
                      if (!res.ok) {
                        const msg = await readApiError(res);
                        toast({
                          title: "Ошибка удаления",
                          description: msg,
                          variant: "destructive",
                        });
                        return;
                      }
                      toast({
                        title: "Модуль удалён",
                        description: "Модуль успешно удалён из базы",
                      });
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
      {/* Вкладка "Задания" - всегда показываем, если есть currentModuleId или moduleId */}
      {(currentModuleId || moduleId) && activeTab === "tasks" && (
        <div className="mt-4">
          <ModuleTasksManager
            key={`${currentModuleId || moduleId}-${newTaskId || "none"}-${activeTab}`}
            moduleId={currentModuleId || moduleId || ""}
            newTaskId={newTaskId}
            refreshTrigger={newTaskId ? Date.now() : undefined}
          />
        </div>
      )}
    </>
  );
}
