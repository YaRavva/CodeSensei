"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import Link from "next/link";
import { useEffect, useState } from "react";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface TasksListProps {
  lessonId: string;
}

export function TasksList({ lessonId }: TasksListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  async function loadTasks() {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("order_index");

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Вы уверены, что хотите удалить это задание?")) return;

    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      alert(`Ошибка: ${error.message}`);
      return;
    }

    await loadTasks();
  }

  if (loading) {
    return <p>Загрузка...</p>;
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Задания не найдены. Создайте первое задание!
          </p>
        </CardContent>
      </Card>
    );
  }

  const getDifficultyBadge = (difficulty: string) => {
    const variants = {
      easy: "default",
      medium: "secondary",
      hard: "destructive",
    } as const;

    return (
      <Badge variant={variants[difficulty as keyof typeof variants]}>
        {difficulty === "easy" ? "Легкое" : difficulty === "medium" ? "Среднее" : "Сложное"}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{task.title}</CardTitle>
                <CardDescription>
                  Порядок: {task.order_index} | XP: {task.xp_reward} |{" "}
                  {getDifficultyBadge(task.difficulty)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{task.description}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/tasks/${task.id}/edit`}>Редактировать</Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(task.id)}>
                Удалить
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
