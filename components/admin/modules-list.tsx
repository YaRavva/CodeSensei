"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import Link from "next/link";
import { useEffect, useState } from "react";

type Module = Database["public"]["Tables"]["modules"]["Row"];

export function ModulesList() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadModules();
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

  async function handleDelete(id: string) {
    if (!confirm("Вы уверены, что хотите удалить этот модуль?")) return;

    const { error } = await supabase.from("modules").update({ is_published: false }).eq("id", id);

    if (error) {
      alert(`Ошибка: ${error.message}`);
      return;
    }

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
        <Card key={module.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{module.title}</CardTitle>
                <CardDescription>{module.topic}</CardDescription>
              </div>
              <Badge variant={module.is_published ? "default" : "secondary"}>
                {module.is_published ? "Опубликован" : "Черновик"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Уровень сложности: {module.level}</p>
              <p>Порядок: {module.order_index}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/modules/${module.id}/edit`}>Редактировать</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/modules/${module.id}/lessons`}>Уроки</Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(module.id)}>
                Удалить
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
