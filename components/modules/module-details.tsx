"use client";

import { ArrowLeft, BookOpen, CheckCircle2, Circle, CircleDot } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { Progress } from "@/components/ui/progress";
import type { Database } from "@/types/db";

type Module = Database["public"]["Tables"]["modules"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface ModuleDetailsProps {
  module: Module;
  tasks: Pick<Task, "id" | "title" | "order_index" | "difficulty" | "xp_reward">[];
  completedTaskIds: string[];
  moduleProgress: number;
}

function getTaskStatus(
  taskId: string,
  completedTaskIds: string[]
): "not_started" | "completed" | "in_progress" {
  return completedTaskIds.includes(taskId) ? "completed" : "not_started";
}

export function ModuleDetails({
  module,
  tasks,
  completedTaskIds,
  moduleProgress,
}: ModuleDetailsProps) {
  const totalTasks = tasks.length;
  const completedTasks = completedTaskIds.length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Навигация назад */}
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/modules">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к модулям
        </Link>
      </Button>

      {/* Заголовок модуля */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{module.title}</h1>
            <p className="text-lg text-muted-foreground">{module.topic}</p>
          </div>
          <Badge variant="outline">Уровень {module.level}</Badge>
        </div>

        {/* Прогресс модуля */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Прогресс модуля</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Завершено заданий</span>
                <span>
                  {completedTasks} из {totalTasks}
                </span>
              </div>
              <Progress value={moduleProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{moduleProgress}% завершено</p>
            </div>
          </CardContent>
        </Card>

        {/* Описание модуля */}
        {module.description && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Описание</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    p: ({ children }) => (
                      <p className="mb-4 last:mb-0 whitespace-pre-line">{children}</p>
                    ),
                  }}
                >
                  {module.description}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Список заданий */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">
          <BookOpen className="inline mr-2 h-6 w-6" />
          Задания ({totalTasks})
        </h2>

        {tasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">В этом модуле пока нет заданий</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {tasks.map((task, index) => {
              const status = getTaskStatus(task.id, completedTaskIds);
              const statusConfig = {
                not_started: {
                  label: "Не начато",
                  icon: Circle,
                  tone: "border-border bg-muted/40 text-muted-foreground",
                },
                in_progress: {
                  label: "В процессе",
                  icon: CircleDot,
                  tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                },
                completed: {
                  label: "Завершено",
                  icon: CheckCircle2,
                  tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                },
              } as const;
              const statusInfo = statusConfig[status];

              return (
                <Card key={task.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <CardTitle className="mb-2">
                          Задание {index + 1}: {task.title}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <DifficultyBadge difficulty={task.difficulty} />
                          {task.xp_reward ? <span>Награда: +{task.xp_reward} XP</span> : null}
                        </div>
                      </div>
                      <Badge variant="outline" className={statusInfo.tone}>
                        <statusInfo.icon className="mr-1 h-4 w-4" aria-hidden="true" />
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <Link href={`/modules/${module.id}/tasks/${task.id}`}>
                        {status === "completed" ? "Открыть задание" : "Начать задание"}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
