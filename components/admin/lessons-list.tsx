"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import Link from "next/link";
import { useEffect, useState } from "react";

type Lesson = Database["public"]["Tables"]["lessons"]["Row"];

interface LessonsListProps {
  moduleId: string;
}

export function LessonsList({ moduleId }: LessonsListProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadLessons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  async function loadLessons() {
    try {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("module_id", moduleId)
        .order("order_index");

      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error("Error loading lessons:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Вы уверены, что хотите удалить этот урок?")) return;

    const { error } = await supabase.from("lessons").delete().eq("id", id);

    if (error) {
      alert(`Ошибка: ${error.message}`);
      return;
    }

    await loadLessons();
  }

  if (loading) {
    return <p>Загрузка...</p>;
  }

  if (lessons.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Уроки не найдены. Создайте первый урок!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {lessons.map((lesson) => (
        <Card key={lesson.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{lesson.title}</CardTitle>
                <CardDescription>
                  Порядок: {lesson.order_index} | Время: {lesson.estimated_duration || "Не указано"}{" "}
                  мин
                </CardDescription>
              </div>
              <Badge variant={lesson.is_published ? "default" : "secondary"}>
                {lesson.is_published ? "Опубликован" : "Черновик"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/lessons/${lesson.id}/edit`}>Редактировать</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/lessons/${lesson.id}/tasks`}>Задания</Link>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(lesson.id)}>
              Удалить
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
