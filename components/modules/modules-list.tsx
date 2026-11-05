"use client";

import { Code2, Lock } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ModuleCard } from "@/components/modules/module-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/types/db";

type Module = Database["public"]["Tables"]["modules"]["Row"];
type UserProgress = Database["public"]["Tables"]["user_progress"]["Row"];

interface ModulesListProps {
  modules: Module[];
  userProgress: UserProgress[];
  tasksCountMap?: Record<string, number>;
  /** Course levels (blocks of 10 modules). */
  levels?: { level: number; title: string; description: string }[];
  /** Highest open level; later levels are shown as a locked divider. */
  openLevel?: number;
}

type ModuleStatus = "not_started" | "in_progress" | "completed";
type SortOption = "order" | "level" | "status" | "title";

/**
 * Определяет статус модуля на основе прогресса пользователя
 */
function getModuleStatus(moduleId: string, userProgress: UserProgress[]): ModuleStatus {
  // Находим прогресс для этого модуля
  const progressEntry = userProgress.find((p) => p.module_id === moduleId);

  // Если нет записи о прогрессе, модуль не начат
  if (!progressEntry) {
    return "not_started";
  }

  // Возвращаем статус из записи прогресса
  return progressEntry.status;
}

export function ModulesList({
  modules,
  userProgress,
  tasksCountMap = {},
  levels = [],
  openLevel = Number.POSITIVE_INFINITY,
}: ModulesListProps) {
  const [filter, setFilter] = useState<{
    status?: ModuleStatus;
    level?: number;
  }>({});
  const [sortOption, setSortOption] = useState<SortOption>("order");

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

  const sortedModules = useMemo(() => {
    const sorted = [...filteredModules];

    switch (sortOption) {
      case "order":
        return sorted.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      case "level":
        return sorted.sort((a, b) => a.level - b.level);
      case "status": {
        const statusOrder: Record<ModuleStatus, number> = {
          not_started: 0,
          in_progress: 1,
          completed: 2,
        };
        return sorted.sort((a, b) => {
          const statusA = getModuleStatus(a.id, userProgress);
          const statusB = getModuleStatus(b.id, userProgress);
          return statusOrder[statusA] - statusOrder[statusB];
        });
      }
      case "title":
        return sorted.sort((a, b) => a.title.localeCompare(b.title, "ru"));
      default:
        return sorted;
    }
  }, [filteredModules, sortOption, userProgress]);

  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card/40 px-6 py-16 text-center">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
          <Code2 className="size-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Модули ещё в пути</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Учебные материалы появятся здесь скоро. А пока можно разобраться, как устроен курс, и
          подготовиться к первому модулю.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/dashboard">Перейти в личный кабинет</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры в одной строке */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Модули</h1>
          <p className="text-muted-foreground mt-2">Выберите модуль для изучения Python</p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Select
            value={statusValue}
            onValueChange={(value) => {
              setFilter((prev) => ({
                ...prev,
                status: value === "all" ? undefined : (value as ModuleStatus),
              }));
            }}
          >
            <SelectTrigger
              className="w-full min-w-[200px] sm:w-auto"
              onClick={(e) => e.stopPropagation()}
            >
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
            onValueChange={(value) => {
              setFilter((prev) => ({
                ...prev,
                level: value === "all" ? undefined : Number.parseInt(value, 10),
              }));
            }}
          >
            <SelectTrigger
              className="w-full min-w-[220px] sm:w-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue placeholder="Все уровни" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все уровни</SelectItem>
              {(levels.length > 0 ? levels : [1, 2, 3].map((level) => ({ level, title: `Уровень ${level}` }))).map((item) => (
                <SelectItem key={item.level} value={String(item.level)}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortOption}
            onValueChange={(value) => {
              setSortOption(value as SortOption);
            }}
          >
            <SelectTrigger
              className="w-full min-w-[200px] sm:w-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="order">По порядку</SelectItem>
              <SelectItem value="level">По уровню</SelectItem>
              <SelectItem value="status">По статусу</SelectItem>
              <SelectItem value="title">По названию</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Список модулей: уровни по 10 модулей, следующий открывается после предыдущего */}
      {levels.length === 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedModules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              status={getModuleStatus(module.id, userProgress)}
              tasksCount={tasksCountMap[module.id] || 0}
            />
          ))}
        </div>
      ) : (
        levels.map((level) => {
          const items = sortedModules.filter((m) => m.level === level.level);
          const all = modules.filter((m) => m.level === level.level);
          if (all.length === 0) return null;
          const done = all.filter((m) => getModuleStatus(m.id, userProgress) === "completed").length;
          const locked = level.level > openLevel;
          const previous = levels.find((item) => item.level === level.level - 1);
          return (
            <section key={level.level} className="space-y-4" aria-labelledby={`level-${level.level}`}>
              <div className="flex items-center gap-4 pt-2">
                <div className="h-px flex-1 bg-border" aria-hidden="true" />
                <div className="text-center">
                  <h2
                    id={`level-${level.level}`}
                    className={`flex items-center justify-center gap-2 text-lg font-semibold ${locked ? "text-muted-foreground" : ""}`}
                  >
                    {locked && <Lock className="size-4" aria-hidden="true" />}
                    {level.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {locked
                      ? `Откроется, когда будут пройдены все модули уровня «${previous?.title ?? ""}»`
                      : `${level.description} Пройдено ${done} из ${all.length}.`}
                  </p>
                </div>
                <div className="h-px flex-1 bg-border" aria-hidden="true" />
              </div>
              {!locked && items.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((module) => (
                    <ModuleCard
                      key={module.id}
                      module={module}
                      status={getModuleStatus(module.id, userProgress)}
                      tasksCount={tasksCountMap[module.id] || 0}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}

      {sortedModules.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Модули не найдены по выбранным фильтрам</p>
        </div>
      )}
    </div>
  );
}
