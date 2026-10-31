"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { TaskForm } from "@/components/admin/task-form";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@/types/db";

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error || `${response.status} ${response.statusText}`;
}

interface ModuleTasksManagerProps {
  moduleId: string;
  newTaskId?: string | null;
  refreshTrigger?: number;
}

export function ModuleTasksManager({
  moduleId,
  newTaskId,
  refreshTrigger,
}: ModuleTasksManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [accordionValue, setAccordionValue] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadTrigger/refreshTrigger намеренно перезапускают загрузку
  useEffect(() => {
    // Строгая проверка валидности moduleId
    if (!moduleId || typeof moduleId !== "string" || moduleId.trim() === "") {
      console.warn("ModuleTasksManager: Invalid moduleId, clearing tasks", { moduleId });
      setTasks([]);
      return;
    }

    let cancelled = false;

    async function loadTasks() {
      try {
        console.log("ModuleTasksManager: Starting to load tasks for module:", moduleId);
        const res = await fetch(`/api/admin/modules/${moduleId}/tasks`, {
          credentials: "include",
        });

        if (cancelled) {
          console.log("ModuleTasksManager: Load cancelled for module:", moduleId);
          return;
        }

        if (!res.ok) {
          throw new Error(await readApiError(res));
        }

        const body = (await res.json()) as { tasks?: Task[] };
        const tasksData = body.tasks ?? [];
        console.log(
          "ModuleTasksManager: Successfully loaded",
          tasksData.length,
          "tasks for module",
          moduleId
        );
        setTasks(tasksData);

        // Если есть ожидающее задание для редактирования, открываем его в accordion
        if (
          pendingTaskId &&
          tasksData &&
          Array.isArray(tasksData) &&
          tasksData.some((t) => t.id === pendingTaskId)
        ) {
          setAccordionValue(pendingTaskId);
          setPendingTaskId(null);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("ModuleTasksManager: Exception loading tasks:", error);
        toast({
          title: "Ошибка загрузки",
          description: error instanceof Error ? error.message : "Не удалось загрузить задания",
          variant: "destructive",
        });
        setTasks([]);
      }
    }

    // Всегда загружаем задания при изменении moduleId
    loadTasks();

    return () => {
      cancelled = true;
    };
  }, [moduleId, reloadTrigger, toast, pendingTaskId, refreshTrigger]);

  // Обработка нового задания извне (из генерации)
  useEffect(() => {
    if (newTaskId) {
      setPendingTaskId(newTaskId);
      setAccordionValue(newTaskId); // Открываем accordion для нового задания
      setReloadTrigger((prev) => prev + 1);
    }
  }, [newTaskId]);

  // Принудительное обновление списка при изменении refreshTrigger
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      setReloadTrigger((prev) => prev + 1);
    }
  }, [refreshTrigger]);

  async function handleDelete(taskId: string, taskTitle: string) {
    if (!confirm(`Вы уверены, что хотите удалить задание "${taskTitle}"?`)) return;

    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      toast({
        title: "Задание удалено",
        description: `Задание "${taskTitle}" успешно удалено`,
      });
      setReloadTrigger((prev) => prev + 1);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось удалить задание",
        variant: "destructive",
      });
    }
  }

  function getDifficultyBadge(difficulty: string) {
    const config =
      difficulty === "easy"
        ? { label: "Легкое", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" }
        : difficulty === "medium"
          ? { label: "Среднее", tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" }
          : { label: "Сложное", tone: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400" };
    return (
      <Badge variant="outline" className={config.tone}>
        {config.label}
      </Badge>
    );
  }

  if (!moduleId || typeof moduleId !== "string" || moduleId.trim() === "") {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">ID модуля не указан</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-tight">Задания модуля</h3>
          <p className="text-sm text-muted-foreground">Всего заданий в модуле: {tasks.length}</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Card className="border border-dashed border-border/80 bg-card/40 backdrop-blur-sm rounded-2xl">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                В этом модуле пока нет заданий. Создайте первое задание вручную или сгенерируйте с помощью ИИ.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Accordion
          type="single"
          collapsible
          value={accordionValue}
          onValueChange={setAccordionValue}
          className="grid gap-4"
        >
          {tasks.map((task, index) => (
            <AccordionItem key={task.id} value={task.id} className="border-none">
              <Card className="group relative overflow-hidden border border-border/60 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5 mb-2">
                        <CardTitle className="text-base font-semibold tracking-tight">
                          {index + 1}. {task.title}
                        </CardTitle>
                        {getDifficultyBadge(task.difficulty)}
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                          +{task.xp_reward} XP
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {task.description.replace(/[#*`]/g, "").substring(0, 150)}
                          {task.description.length > 150 ? "..." : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between border-t border-border/40 pt-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                      <span>Порядок: #{task.order_index}</span>
                      <span>•</span>
                      <span>
                        Тестов: {Array.isArray(task.test_cases) ? task.test_cases.length : 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-xl transition-transform duration-200 active:scale-[0.98]"
                        onClick={() =>
                          setAccordionValue(accordionValue === task.id ? undefined : task.id)
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Редактировать
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="gap-1.5 rounded-xl transition-transform duration-200 active:scale-[0.98]"
                        onClick={() => handleDelete(task.id, task.title)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Удалить
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <AccordionContent className="px-6 pb-6">
                  <div className="pt-4 border-t border-border/40">
                    <TaskForm
                      moduleId={moduleId}
                      taskId={task.id}
                      onSuccess={async () => {
                        setAccordionValue(undefined);
                        setReloadTrigger((prev) => prev + 1);
                      }}
                      onCancel={() => {}}
                    />
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
