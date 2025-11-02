"use client";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


interface ModuleFormProps {
  moduleId?: string;
}

export function ModuleForm({ moduleId }: ModuleFormProps) {
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

  useEffect(() => {
    if (moduleId) {
      loadModule();
    }
  }, [moduleId]);

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
          description: "Поля заполнены автоматически. Проверьте и отредактируйте при необходимости.",
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

    const moduleData = {
      title,
      description: description || null,
      topic,
      level: Number.parseInt(level, 10),
      order_index: Number.parseInt(orderIndex, 10),
      is_published: isPublished,
    };

    try {
      if (moduleId) {
        const { data, error } = await supabase.from("modules").update(moduleData).eq("id", moduleId).select().single();

        if (error) {
          console.error("Update error:", error);
          throw error;
        }

        if (!data) {
          throw new Error("Не удалось обновить модуль. Данные не возвращены.");
        }

        toast({
          title: "Модуль обновлен",
          description: "Изменения сохранены в базе данных",
        });
      } else {
        // Проверяем текущего пользователя перед вставкой
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        if (userError || !currentUser) {
          console.error("Auth error:", userError);
          throw new Error("Не удалось подтвердить аутентификацию пользователя");
        }

        console.log("Creating module with data:", {
          ...moduleData,
          created_by: currentUser.id,
          user_id: currentUser.id,
          user_email: currentUser.email,
        });

        // Проверяем роль пользователя через RPC
        const { data: userRole, error: roleError } = await (supabase.rpc as any)("get_user_role", {
          user_id: currentUser.id,
        });

        console.log("User role check:", { userRole, roleError });

        if (roleError || (userRole !== "admin" && userRole !== "teacher")) {
          console.error("Role check failed:", { userRole, roleError });
          throw new Error(`Недостаточно прав для создания модуля. Роль: ${userRole || "не определена"}`);
        }

        const { data: insertedData, error } = await supabase
          .from("modules")
          .insert({
            ...moduleData,
            created_by: currentUser.id,
          })
          .select()
          .single();

        if (error) {
          console.error("Insert error:", error);
          console.error("Error details:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }

        if (!insertedData) {
          throw new Error("Не удалось создать модуль. Данные не возвращены из базы.");
        }

        console.log("Module created successfully:", insertedData);

        toast({
          title: "Модуль создан",
          description: `Модуль "${insertedData.title}" успешно сохранен в базе данных`,
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
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              className="min-h-[500px] font-mono text-sm"
              placeholder="Введите описание в формате Markdown..."
            />
          </div>
          <div className="space-y-2">
            <Label>Предпросмотр</Label>
            <div className="border rounded-md p-4 h-[500px] overflow-auto bg-card">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {description || "*Введите текст выше для предпросмотра*"}
                </ReactMarkdown>
              </div>
            </div>
          </div>
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
                // Автоматически заполняем название из темы, если оно пустое
                if (!title && e.target.value.trim()) {
                  setTitle(e.target.value.trim());
                }
              }}
              placeholder="Например: Переменные, Циклы, Функции"
              required
              disabled={loading || generating}
            />
            {generating && (
              <p className="text-sm text-muted-foreground">
                ИИ генерирует контент модуля... Это может занять несколько секунд.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Уровень сложности (1-5) *</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue />
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
            <Switch
              id="isPublished"
              checked={isPublished}
              onCheckedChange={setIsPublished}
              disabled={loading}
            />
            <Label htmlFor="isPublished">Опубликован</Label>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
            Отмена
          </Button>
          <Button type="submit" disabled={loading || generating}>
            {loading ? "Сохранение..." : moduleId ? "Сохранить" : "Создать"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
