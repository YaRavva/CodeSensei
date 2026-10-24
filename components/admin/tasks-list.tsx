"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Task } from "@/types/db";

interface TasksListProps {
  moduleId: string;
}

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error || `${response.status} ${response.statusText}`;
}

export function TasksList({ moduleId }: TasksListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/modules/${moduleId}/tasks`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      const body = (await res.json()) as { tasks?: Task[] };
      setTasks(body.tasks ?? []);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function handleDelete(id: string) {
    if (!confirm("Вы уверены, что хотите удалить это задание?")) return;

    try {
      const res = await fetch(`/api/admin/tasks/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      await loadTasks();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось удалить задание";
      alert(`Ошибка: ${message}`);
    }
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
      easy: {
        variant: "default" as const,
        className: "bg-green-500 hover:bg-green-600 text-white border-transparent",
      },
      medium: {
        variant: "default" as const,
        className: "bg-yellow-500 hover:bg-yellow-600 text-white border-transparent",
      },
      hard: { variant: "destructive" as const, className: undefined },
    } as const;

    const config = variants[difficulty as keyof typeof variants] || variants.easy;
    return (
      <Badge variant={config.variant} className={config.className}>
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
