"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {modules.map((module) => (
        <Card key={module.id} className="flex h-full flex-col">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{module.title}</CardTitle>
                <CardDescription>{module.topic}</CardDescription>
              </div>
              <div
                className={badgeVariants({
                  variant: module.is_published ? "default" : "secondary",
                })}
              >
                {module.is_published ? "Опубликован" : "Черновик"}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Уровень сложности: {module.level}</p>
              <p>Порядок: {module.order_index}</p>
            </div>
            <div className="mt-auto flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/modules/${module.id}/edit`}>Редактировать</Link>
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => requestDelete(module.id, module.title)}
              >
                Удалить
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-destructive/10 p-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle>Удалить модуль?</DialogTitle>
                <DialogDescription>
                  Вы действительно хотите удалить «
                  <span className="font-medium text-foreground">{deletingTitle}</span>»? Это
                  действие нельзя отменить.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Отмена
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirmed}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
