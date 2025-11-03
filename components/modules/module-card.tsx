"use client";

import type { Database } from "@/types/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

type Module = Database["public"]["Tables"]["modules"]["Row"];

type ModuleStatus = "not_started" | "in_progress" | "completed";

interface ModuleCardProps {
  module: Module;
  status: ModuleStatus;
}

const statusConfig: Record<
  ModuleStatus,
  { label: string; color: string; icon: "🔴" | "🟡" | "🟢" }
> = {
  not_started: { label: "Не начат", color: "destructive", icon: "🔴" },
  in_progress: { label: "В процессе", color: "default", icon: "🟡" },
  completed: { label: "Завершен", color: "secondary", icon: "🟢" },
};

export function ModuleCard({ module, status }: ModuleCardProps) {
  const statusInfo = statusConfig[status];

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="mb-2">{module.title}</CardTitle>
            <CardDescription>{module.topic}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge
              variant={statusInfo.color as "default" | "destructive" | "secondary"}
              className={
                status === "not_started"
                  ? "bg-destructive/10 text-destructive border border-destructive/30"
                  : undefined
              }
            >
              <span className="mr-1">{statusInfo.icon}</span>
              {statusInfo.label}
            </Badge>
            <Badge variant="outline">Уровень {module.level}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {module.description && (
          <div className="text-sm text-muted-foreground line-clamp-3">
            {module.description.substring(0, 150)}
            {module.description.length > 150 ? "..." : ""}
          </div>
        )}
        <Button asChild className="w-full">
          <Link href={`/modules/${module.id}`}>
            {status === "not_started" ? "Начать изучение" : "Продолжить"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

