"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TaskForm } from "@/components/admin/task-form";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface ModuleTasksManagerProps {
  moduleId: string;
}

export function ModuleTasksManager({ moduleId }: ModuleTasksManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();

  const loadTasks = async () => {
    if (!moduleId) {
      setLoading(false);
      setTasks([]);
      return;
    }

    try {
      setLoading(true);
      const client = createClient();
      const { data, error } = await client
        .from("tasks")
        .select("*")
        .eq("module_id", moduleId)
        .order("order_index");

      if (error) {
        console.error("Error loading tasks:", error);
        throw error;
      }
      
      console.log("Loaded tasks:", data?.length || 0, "for module:", moduleId);
      setTasks(data || []);
    } catch (error) {
      console.error("Error loading tasks:", error);
      const errorMessage = error instanceof Error ? error.message : "Не удалось загрузить задания";
      toast({
        title: "Ошибка загрузки",
        description: errorMessage,
        variant: "destructive",
      });
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  async function handleDelete(taskId: string, taskTitle: string) {
    if (!confirm(`Вы уверены, что хотите удалить задание "${taskTitle}"?`)) return;

    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Задание удалено",
        description: `Задание "${taskTitle}" успешно удалено`,
      });
      await loadTasks();
      router.refresh();
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

  if (!moduleId) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Загрузка заданий...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Задания модуля</h3>
          <p className="text-sm text-muted-foreground">
            Всего заданий: {tasks.length}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setIsCreateDialogOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Создать задание
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                В этом модуле пока нет заданий
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Создать первое задание
              </Button>
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

      {/* Диалог создания нового задания */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Создать новое задание</DialogTitle>
          </DialogHeader>
          <TaskForm
            moduleId={moduleId}
            onSuccess={async () => {
              setIsCreateDialogOpen(false);
              await loadTasks();
              router.refresh();
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

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
                await loadTasks();
                router.refresh();
              }}
              onCancel={() => setEditingTaskId(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

