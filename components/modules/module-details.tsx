"use client";

import type { Database } from "@/types/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Module = Database["public"]["Tables"]["modules"]["Row"];
type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type UserProgress = Database["public"]["Tables"]["user_progress"]["Row"];

interface ModuleDetailsProps {
  module: Module;
  lessons: Lesson[];
  userProgress: UserProgress[];
  moduleProgress: number;
}

function getLessonStatus(
  lessonId: string,
  progress: UserProgress[]
): "not_started" | "in_progress" | "completed" {
  const lessonProgress = progress.find((p) => p.lesson_id === lessonId);
  if (!lessonProgress) return "not_started";
  if (lessonProgress.status === "completed") return "completed";
  return "in_progress";
}

export function ModuleDetails({
  module,
  lessons,
  userProgress,
  moduleProgress,
}: ModuleDetailsProps) {
  const totalLessons = lessons.length;
  const completedLessons = userProgress.filter(
    (p) => p.status === "completed"
  ).length;

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
                <span>Завершено уроков</span>
                <span>
                  {completedLessons} из {totalLessons}
                </span>
              </div>
              <Progress value={moduleProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {moduleProgress}% завершено
              </p>
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
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {module.description}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Список уроков */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">
          <BookOpen className="inline mr-2 h-6 w-6" />
          Уроки ({totalLessons})
        </h2>

        {lessons.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                В этом модуле пока нет уроков
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {lessons.map((lesson, index) => {
              const status = getLessonStatus(lesson.id, userProgress);
              const statusConfig = {
                not_started: { label: "Не начат", icon: "🔴", variant: "outline" as const },
                in_progress: { label: "В процессе", icon: "🟡", variant: "default" as const },
                completed: { label: "Завершен", icon: "🟢", variant: "secondary" as const },
              };
              const statusInfo = statusConfig[status];

              return (
                <Card key={lesson.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="mb-2">
                          Урок {index + 1}: {lesson.title}
                        </CardTitle>
                        {lesson.duration_minutes && (
                          <CardDescription>
                            Продолжительность: ~{lesson.duration_minutes} минут
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant={statusInfo.variant}>
                        <span className="mr-1">{statusInfo.icon}</span>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <Link href={`/modules/${module.id}/lessons/${lesson.id}`}>
                        {status === "not_started"
                          ? "Начать урок"
                          : status === "completed"
                            ? "Повторить урок"
                            : "Продолжить"}
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

