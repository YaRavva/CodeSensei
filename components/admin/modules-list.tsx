"use client";

import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

type Module = Database["public"]["Tables"]["modules"]["Row"];

interface ModulesListProps {
  initialModules?: Module[];
}

export function ModulesList({ initialModules }: ModulesListProps) {
  const [modules, setModules] = useState<Module[]>(initialModules ?? []);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingTitle, setDeletingTitle] = useState<string>("");
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    if (initialModules && initialModules.length >= 0) {
      setLoading(false);
    } else {
      loadModules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadModules() {
    try {
      // Проверяем текущего пользователя
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("Auth error in loadModules:", userError);
        setLoading(false);
        return;
      }

      console.log("Loading modules for user:", user.id, user.email);

      const { data, error } = await supabase.from("modules").select("*").order("order_index");

      if (error) {
        console.error("Error loading modules:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }
      
      console.log("Modules loaded:", data?.length || 0);
      setModules(data || []);
    } catch (error) {
      console.error("Error loading modules:", error);
    } finally {
      setLoading(false);
    }
  }

  function requestDelete(id: string, title: string) {
    setDeletingId(id);
    setDeletingTitle(title || "модуль");
    setConfirmOpen(true);
  }

  async function handleDeleteConfirmed() {
    if (!deletingId) return;
    // Жёсткое удаление через серверный маршрут (с каскадным удалением зависимостей)
    const res = await fetch(`/api/admin/modules/${deletingId}/delete`, { method: "POST" });
    setConfirmOpen(false);
    setDeletingId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error || `${res.status} ${res.statusText}`;
      console.error("Delete error:", msg);
      toast({ title: "Ошибка удаления", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "Модуль удалён", description: `«${deletingTitle}» успешно удалён из базы` });
    await loadModules();
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
              <div className={badgeVariants({ variant: module.is_published ? "default" : "secondary" })}>
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
            <Button type="button" variant="destructive" size="sm" onClick={() => requestDelete(module.id, module.title)}>
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
                  Вы действительно хотите удалить «<span className="font-medium text-foreground">{deletingTitle}</span>»?
                  Это действие нельзя отменить.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>Отмена</Button>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirmed}>Удалить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
