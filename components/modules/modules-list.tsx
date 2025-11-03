"use client";

import type { Database } from "@/types/supabase";
import { ModuleCard } from "@/components/modules/module-card";
import { useState } from "react";

type Module = Database["public"]["Tables"]["modules"]["Row"];
type UserProgress = Database["public"]["Tables"]["user_progress"]["Row"];

interface ModulesListProps {
  modules: Module[];
  userProgress: UserProgress[];
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

export function ModulesList({ modules, userProgress }: ModulesListProps) {
  const [filter, setFilter] = useState<{
    status?: ModuleStatus;
    level?: number;
  }>({});

  // Фильтруем модули
  const filteredModules = modules.filter((module) => {
    if (filter.status) {
      const status = getModuleStatus(module.id, userProgress);
      if (status !== filter.status) return false;
    }
    if (filter.level && module.level !== filter.level) return false;
    return true;
  });

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
      {/* Фильтры */}
      <div className="flex gap-4 flex-wrap">
        <select
          className="px-3 py-2 border rounded-md bg-background"
          value={filter.status || ""}
          onChange={(e) =>
            setFilter({
              ...filter,
              status: e.target.value ? (e.target.value as ModuleStatus) : undefined,
            })
          }
        >
          <option value="">Все статусы</option>
          <option value="not_started">Не начат</option>
          <option value="in_progress">В процессе</option>
          <option value="completed">Завершен</option>
        </select>
        <select
          className="px-3 py-2 border rounded-md bg-background"
          value={filter.level || ""}
          onChange={(e) =>
            setFilter({
              ...filter,
              level: e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
            })
          }
        >
          <option value="">Все уровни</option>
          <option value="1">Уровень 1 - Начальный</option>
          <option value="2">Уровень 2 - Базовый</option>
          <option value="3">Уровень 3 - Средний</option>
          <option value="4">Уровень 4 - Продвинутый</option>
          <option value="5">Уровень 5 - Эксперт</option>
        </select>
      </div>

      {/* Список модулей */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredModules.map((module) => {
          const status = getModuleStatus(module.id, userProgress);
          return (
            <ModuleCard key={module.id} module={module} status={status} />
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

