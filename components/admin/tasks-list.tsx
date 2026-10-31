"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { useToast } from "@/hooks/use-toast";
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
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

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

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/tasks/${pendingDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      setTasks((prev) => prev.filter((task) => task.id !== pendingDelete.id));
      setPendingDelete(null);
      toast({
        title: "Задание удалено",
        description: `«${pendingDelete.title}» больше не входит в модуль`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось удалить задание";
      toast({
        title: "Задание не удалено",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-32 rounded-lg border bg-muted motion-safe:animate-pulse" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="space-y-2">
            <p className="font-semibold text-foreground">В модуле пока нет заданий</p>
            <p className="text-sm text-muted-foreground">
              Добавьте первое задание, чтобы ученики могли начать практику.
            </p>
          </div>
          <Button asChild>
            <Link href={`/admin/modules/${moduleId}/edit`}>Добавить задание</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{task.title}</CardTitle>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>Порядок: {task.order_index}</span>
                  <span aria-hidden="true">·</span>
                  <span>XP: {task.xp_reward}</span>
                  <DifficultyBadge difficulty={task.difficulty} />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/tasks/${task.id}/edit`}>Редактировать</Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setPendingDelete(task)}>
                Удалить
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Удалить задание?"
        description={`«${pendingDelete?.title ?? ""}» исчезнет из модуля вместе с прогрессом учеников по нему. Действие нельзя отменить.`}
        confirmLabel="Удалить задание"
        onConfirm={handleDelete}
        pending={deleting}
      />
    </div>
  );
}
