"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";


interface LessonFormProps {
  moduleId?: string;
  lessonId?: string;
}

export function LessonForm({ moduleId, lessonId }: LessonFormProps) {
  const [title, setTitle] = useState("");
  const [theoryContent, setTheoryContent] = useState("");
  const [orderIndex, setOrderIndex] = useState("0");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [currentModuleId, setCurrentModuleId] = useState(moduleId || "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    if (lessonId) {
      loadLesson();
    }
  }, [lessonId]);

  async function loadLesson() {
    if (!lessonId) return;

    const { data, error } = await supabase.from("lessons").select("*").eq("id", lessonId).single();

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
      setTheoryContent(data.theory_content || "");
      setOrderIndex(data.order_index.toString());
      setEstimatedDuration(data.estimated_duration?.toString() || "");
      setIsPublished(data.is_published ?? false);
      setCurrentModuleId(data.module_id);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const lessonData = {
      title,
      theory_content: theoryContent || null,
      order_index: Number.parseInt(orderIndex),
      estimated_duration: estimatedDuration ? Number.parseInt(estimatedDuration) : null,
      is_published: isPublished,
    };

    try {
      if (lessonId) {
        const { error } = await supabase.from("lessons").update(lessonData).eq("id", lessonId);

        if (error) throw error;

        toast({
          title: "Урок обновлен",
          description: "Изменения сохранены",
        });
      } else {
        if (!currentModuleId) {
          throw new Error("Не указан модуль");
        }

        const { error } = await supabase.from("lessons").insert({
          ...lessonData,
          module_id: currentModuleId,
        });

        if (error) throw error;

        toast({
          title: "Урок создан",
          description: "Новый урок успешно создан",
        });
      }

      router.push(`/admin/modules/${currentModuleId}/lessons`);
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
          <CardTitle>{lessonId ? "Редактировать урок" : "Новый урок"}</CardTitle>
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
            <Label htmlFor="theoryContent">Теория (Markdown)</Label>
            <Textarea
              id="theoryContent"
              value={theoryContent}
              onChange={(e) => setTheoryContent(e.target.value)}
              rows={15}
              placeholder="Введите теорию урока в формате Markdown..."
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground">
              Поддерживается Markdown синтаксис: заголовки, списки, код и т.д.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderIndex">Порядок в модуле *</Label>
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
            <div className="space-y-2">
              <Label htmlFor="estimatedDuration">Время прохождения (минуты)</Label>
              <Input
                id="estimatedDuration"
                type="number"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                min="1"
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
          <Button type="submit" disabled={loading}>
            {loading ? "Сохранение..." : lessonId ? "Сохранить" : "Создать"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
