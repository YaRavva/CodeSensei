"use client";

import type { Database } from "@/types/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Module = Database["public"]["Tables"]["modules"]["Row"];
type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

interface LessonDetailsProps {
  module: Module;
  lesson: Lesson;
  tasks: Task[];
  prevLesson: { id: string; title: string } | null;
  nextLesson: { id: string; title: string } | null;
}

export function LessonDetails({
  module,
  lesson,
  tasks,
  prevLesson,
  nextLesson,
}: LessonDetailsProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Навигация */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link href={`/modules/${module.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к модулю
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/modules" className="hover:underline">
            Модули
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/modules/${module.id}`} className="hover:underline">
            {module.title}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span>{lesson.title}</span>
        </div>
      </div>

      {/* Заголовок урока */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{lesson.title}</h1>
        <div className="flex items-center gap-4">
          {lesson.duration_minutes && (
            <Badge variant="outline">
              ~{lesson.duration_minutes} минут
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">
            Модуль: {module.title}
          </span>
        </div>
      </div>

      {/* Теория урока */}
      {lesson.theory && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Теория
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {lesson.theory}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Список заданий */}
      <div className="space-y-4 mb-8">
        <h2 className="text-2xl font-bold">Задания ({tasks.length})</h2>

        {tasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                В этом уроке пока нет заданий
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, index) => (
              <Card key={task.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-2">
                        Задание {index + 1}: {task.title}
                      </CardTitle>
                      {task.description && (
                        <CardDescription className="line-clamp-2">
                          {task.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <Badge variant="outline">
                        {task.difficulty === "easy"
                          ? "Легкое"
                          : task.difficulty === "medium"
                            ? "Среднее"
                            : "Сложное"}
                      </Badge>
                      {task.xp_reward && (
                        <Badge variant="secondary">
                          +{task.xp_reward} XP
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <Link
                      href={`/modules/${module.id}/lessons/${lesson.id}/tasks/${task.id}`}
                    >
                      Начать задание
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Навигация между уроками */}
      <div className="flex justify-between gap-4 pt-6 border-t">
        {prevLesson ? (
          <Button variant="outline" asChild>
            <Link href={`/modules/${module.id}/lessons/${prevLesson.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Предыдущий урок: {prevLesson.title}
            </Link>
          </Button>
        ) : (
          <div />
        )}
        {nextLesson ? (
          <Button variant="outline" asChild>
            <Link href={`/modules/${module.id}/lessons/${nextLesson.id}`}>
              Следующий урок: {nextLesson.title}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

