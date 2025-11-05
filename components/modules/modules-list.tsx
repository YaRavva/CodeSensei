"use client";

import type { Database } from "@/types/supabase";
import { ModuleCard } from "@/components/modules/module-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState } from "react";

type Module = Database["public"]["Tables"]["modules"]["Row"];
type UserProgress = Database["public"]["Tables"]["user_progress"]["Row"];

interface ModulesListProps {
  modules: Module[];
  userProgress: UserProgress[];
  tasksCountMap?: Record<string, number>;
}

type ModuleStatus = "not_started" | "in_progress" | "completed";

/**
 * Определяет статус модуля на основе прогресса пользователя
 */
function getModuleStatus(
  moduleId: string,
  userProgress: UserProgress[]
): ModuleStatus {
  // Находим прогресс для этого модуля
  const progressEntry = userProgress.find((p) => p.module_id === moduleId);

  // Если нет записи о прогрессе, модуль не начат
  if (!progressEntry) {
    return "not_started";
  }

  // Возвращаем статус из записи прогресса
  return progressEntry.status;
}

export function ModulesList({ modules, userProgress, tasksCountMap = {} }: ModulesListProps) {
  const [filter, setFilter] = useState<{
    status?: ModuleStatus;
    level?: number;
  }>({});

  const statusValue = filter.status ?? "all";
  const levelValue = filter.level ? String(filter.level) : "all";

  const filteredModules = useMemo(() => {
    return modules.filter((module) => {
      if (filter.status) {
        const status = getModuleStatus(module.id, userProgress);
        if (status !== filter.status) return false;
      }
      if (filter.level && module.level !== filter.level) return false;
      return true;
    });
  }, [modules, filter, userProgress]);

  if (modules.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Модули пока не доступны. Скоро здесь появятся учебные материалы!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры в одной строке */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Модули</h1>
          <p className="text-muted-foreground mt-2">
            Выберите модуль для изучения Python
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Select
            value={statusValue}
            onValueChange={(value) =>
              setFilter((prev) => ({
                ...prev,
                status: value === "all" ? undefined : (value as ModuleStatus),
              }))
            }
          >
            <SelectTrigger className="w-full min-w-[200px] sm:w-auto">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="not_started">Не начат</SelectItem>
              <SelectItem value="in_progress">В процессе</SelectItem>
              <SelectItem value="completed">Завершен</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={levelValue}
            onValueChange={(value) =>
              setFilter((prev) => ({
                ...prev,
                level: value === "all" ? undefined : Number.parseInt(value, 10),
              }))
            }
          >
            <SelectTrigger className="w-full min-w-[220px] sm:w-auto">
              <SelectValue placeholder="Все уровни" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все уровни</SelectItem>
              <SelectItem value="1">Уровень 1 — Начальный</SelectItem>
              <SelectItem value="2">Уровень 2 — Базовый</SelectItem>
              <SelectItem value="3">Уровень 3 — Средний</SelectItem>
              <SelectItem value="4">Уровень 4 — Продвинутый</SelectItem>
              <SelectItem value="5">Уровень 5 — Эксперт</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Список модулей */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredModules.map((module) => {
          const status = getModuleStatus(module.id, userProgress);
          const tasksCount = tasksCountMap[module.id] || 0;
          return (
            <ModuleCard key={module.id} module={module} status={status} tasksCount={tasksCount} />
          );
        })}
      </div>

      {filteredModules.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Модули не найдены по выбранным фильтрам
          </p>
        </div>
      )}
    </div>
  );
}

