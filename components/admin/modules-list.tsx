"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { useEffect, useState } from "react";
import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Module } from "@/types/db";

interface ModulesListProps {
  initialModules?: Module[];
}

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error || `${response.status} ${response.statusText}`;
}

export function ModulesList({ initialModules }: ModulesListProps) {
  const [modules, setModules] = useState<Module[]>(initialModules ?? []);
  const [loading, setLoading] = useState(initialModules === undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingTitle, setDeletingTitle] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (initialModules !== undefined) {
      setModules(initialModules);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadModules() {
      try {
        const res = await fetch("/api/admin/modules", { credentials: "include" });
        if (!res.ok) {
          throw new Error(await readApiError(res));
        }
        const body = (await res.json()) as { modules?: Module[] };
        if (!cancelled) {
          setModules(body.modules ?? []);
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error loading modules:", error);
        toast({
          title: "Ошибка загрузки",
          description: error instanceof Error ? error.message : "Не удалось загрузить модули",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadModules();
    return () => {
      cancelled = true;
    };
  }, [initialModules, toast]);

  function requestDelete(id: string, title: string) {
    setDeletingId(id);
    setDeletingTitle(title || "модуль");
    setConfirmOpen(true);
  }

  async function handleDeleteConfirmed() {
    if (!deletingId) return;
    const id = deletingId;
    setConfirmOpen(false);
    setDeletingId(null);

    try {
      const res = await fetch(`/api/admin/modules/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      setModules((prev) => prev.filter((module) => module.id !== id));
      toast({
        title: "Модуль удалён",
        description: `«${deletingTitle}» успешно удалён из базы`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Не удалось удалить модуль";
      console.error("Delete error:", msg);
      toast({ title: "Ошибка удаления", description: msg, variant: "destructive" });
    }
  }

  if (loading) {
    return <p>Загрузка...</p>;
  }

  if (modules.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Модули не найдены. Создайте первый модуль!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {modules.map((module) => (
        <Card key={module.id} className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
          <CardHeader className="p-4 sm:p-5 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {module.title}
                </CardTitle>
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Тема: {module.topic}
                </CardDescription>
              </div>
              <div
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  module.is_published
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                }`}
              >
                {module.is_published ? "Опубликован" : "Черновик"}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between space-y-4 p-4 sm:p-5 pt-0">
            <div className="text-sm text-muted-foreground line-clamp-2 prose prose-sm dark:prose-invert max-w-none">
              {module.description ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    p: ({ children }) => <span className="inline">{children}</span>,
                    a: ({ children }) => <span className="text-primary underline">{children}</span>,
                    code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">{children}</code>,
                    pre: ({ children }) => <span className="block truncate">{children}</span>,
                    ul: ({ children }) => <span className="inline">{children}</span>,
                    ol: ({ children }) => <span className="inline">{children}</span>,
                    li: ({ children }) => <span className="inline mr-2">• {children}</span>,
                    h1: ({ children }) => <span className="font-semibold">{children}</span>,
                    h2: ({ children }) => <span className="font-semibold">{children}</span>,
                    h3: ({ children }) => <span className="font-semibold">{children}</span>,
                    blockquote: ({ children }) => <span className="italic text-muted-foreground">{children}</span>,
                    hr: () => <span className="mx-1 text-muted-foreground"> | </span>,
                  }}
                >
                  {module.description}
                </ReactMarkdown>
              ) : (
                "Описание модуля отсутствует."
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-3">
              <span>Сложность: Уровень {module.level}</span>
              <span>Порядок: #{module.order_index}</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" asChild className="flex-1 transition-transform duration-200 active:scale-[0.98]">
                <Link href={`/admin/modules/${module.id}/edit`}>Редактировать</Link>
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => requestDelete(module.id, module.title)}
                className="transition-transform duration-200 active:scale-[0.98]"
              >
                Удалить
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/80 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-destructive/10 p-2.5 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-lg font-semibold">Удалить модуль?</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Вы действительно хотите удалить «
                  <span className="font-medium text-foreground">{deletingTitle}</span>»? Это
                  действие нельзя отменить, все связанные задания будут удалены.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} className="rounded-xl">
              Отмена
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirmed} className="rounded-xl">
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
