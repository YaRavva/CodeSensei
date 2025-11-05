"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskForm } from "@/components/admin/task-form";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2 } from "lucide-react";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface ModuleTasksManagerProps {
  moduleId: string;
  newTaskId?: string | null;
}

export function ModuleTasksManager({ moduleId, newTaskId }: ModuleTasksManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!moduleId || typeof moduleId !== "string" || moduleId.trim() === "") {
      setTasks([]);
      return;
    }

    let cancelled = false;

    async function loadTasks() {
      try {
        const client = createClient();
        const { data, error } = await client
          .from("tasks")
          .select("*")
          .eq("module_id", moduleId)
          .order("order_index");

        if (cancelled) return;

        if (error) {
          console.error("ModuleTasksManager: Error loading tasks:", error);
          toast({
            title: "Ошибка загрузки",
            description: error.message,
            variant: "destructive",
          });
          setTasks([]);
          return;
        }

        console.log("ModuleTasksManager: Loaded", data?.length || 0, "tasks for module", moduleId);
        setTasks(data || []);
        
        // Если есть ожидающее задание для редактирования, открываем его
        if (pendingTaskId && data && data.some(t => t.id === pendingTaskId)) {
          setEditingTaskId(pendingTaskId);
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

    console.log("ModuleTasksManager: useEffect triggered, moduleId:", moduleId);
    loadTasks();

    return () => {
      cancelled = true;
    };
  }, [moduleId, reloadTrigger, toast, pendingTaskId]);
  
  // Обработка нового задания извне (из генерации)
  useEffect(() => {
    if (newTaskId) {
      setPendingTaskId(newTaskId);
      setReloadTrigger((prev) => prev + 1);
    }
  }, [newTaskId]);

  async function handleDelete(taskId: string, taskTitle: string) {
    if (!confirm(`Вы уверены, что хотите удалить задание "${taskTitle}"?`)) return;

    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;

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
    const variants = {
      easy: { variant: "default" as const, label: "Легкое" },
      medium: { variant: "secondary" as const, label: "Среднее" },
      hard: { variant: "destructive" as const, label: "Сложное" },
    };
    const config = variants[difficulty as keyof typeof variants] || variants.easy;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }

  if (!moduleId || typeof moduleId !== "string" || moduleId.trim() === "") {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            ID модуля не указан
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Задания модуля</h3>
        <p className="text-sm text-muted-foreground">
          Всего заданий: {tasks.length}
        </p>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                В этом модуле пока нет заданий. Используйте вкладку "Генерация заданий ИИ" для создания заданий.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-base font-semibold">
                        {task.order_index}. {task.title}
                      </CardTitle>
                      {getDifficultyBadge(task.difficulty)}
                      {task.xp_reward && (
                        <Badge variant="outline" className="gap-1">
                          +{task.xp_reward} XP
                        </Badge>
                      )}
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Порядок: {task.order_index}</span>
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
                      onClick={() => setEditingTaskId(task.id)}
                      className="gap-2"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Редактировать
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(task.id, task.title)}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Удалить
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Диалог редактирования задания */}
      {editingTaskId && (
        <Dialog open={!!editingTaskId} onOpenChange={(open) => !open && setEditingTaskId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Редактировать задание</DialogTitle>
            </DialogHeader>
            <TaskForm
              taskId={editingTaskId}
              onSuccess={async () => {
                setEditingTaskId(null);
                setReloadTrigger((prev) => prev + 1);
              }}
              onCancel={() => setEditingTaskId(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

