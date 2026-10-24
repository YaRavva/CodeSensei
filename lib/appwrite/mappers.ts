import type { AppwriteRow } from "@/lib/appwrite/db";
import type {
  Achievement,
  AiGenerationLog,
  Json,
  Module,
  Task,
  TaskAttempt,
  UserAchievement,
  UserProfile,
  UserProgress,
} from "@/types/db";

type Row = AppwriteRow;

function base(row: Row): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (!key.startsWith("$")) data[key] = value;
  }

  return {
    ...data,
    id: row.$id,
    created_at: row.$createdAt,
    updated_at: row.$updatedAt,
  };
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value as T;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toUserProfile(row: Row): UserProfile {
  const data = base(row);
  return {
    id: data.id as string,
    email: (data.email as string | null) ?? null,
    display_name: (data.display_name as string | null) ?? null,
    role: (data.role as string) || "student",
    avatar_url: (data.avatar_url as string | null) ?? null,
    total_xp: Number(data.total_xp ?? 0),
    current_level: Number(data.current_level ?? 1),
    created_at: data.created_at as string,
    last_active_at: (data.last_active_at as string | null) ?? null,
  };
}

export function toModule(row: Row): Module {
  const data = base(row);
  return {
    id: data.id as string,
    title: data.title as string,
    description: (data.description as string | null) ?? null,
    topic: data.topic as string,
    level: Number(data.level ?? 1),
    order_index: Number(data.order_index ?? 0),
    is_published: Boolean(data.is_published),
    created_by: (data.created_by as string | null) ?? "",
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

export function toTask(row: Row): Task {
  const data = base(row);
  return {
    id: data.id as string,
    module_id: data.module_id as string,
    title: data.title as string,
    description: data.description as string,
    starter_code: (data.starter_code as string | null) ?? "",
    solution_code: (data.solution_code as string | null) ?? null,
    test_cases: parseJson<Json>(data.test_cases, []),
    xp_reward: Number(data.xp_reward ?? 10),
    difficulty: (data.difficulty as Task["difficulty"]) || "easy",
    hints: parseJson<Json | null>(data.hints, null),
    order_index: Number(data.order_index ?? 0),
    variant_number: data.variant_number == null ? null : Number(data.variant_number),
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

export function toTaskAttempt(row: Row): TaskAttempt {
  const data = base(row);
  return {
    id: data.id as string,
    user_id: data.user_id as string,
    task_id: data.task_id as string,
    code_solution: (data.code_solution as string) ?? "",
    test_results: parseJson<Json>(data.test_results, {}),
    is_successful: Boolean(data.is_successful),
    used_ai_hint: Boolean(data.used_ai_hint),
    execution_time_ms: data.execution_time_ms == null ? null : Number(data.execution_time_ms),
    solving_time_ms: data.solving_time_ms == null ? null : Number(data.solving_time_ms),
    error_message: (data.error_message as string | null) ?? null,
    created_at: (data.created_at as string) ?? data.updated_at,
  };
}

export function toUserProgress(row: Row): UserProgress {
  const data = base(row);
  return {
    id: data.id as string,
    user_id: data.user_id as string,
    module_id: data.module_id as string,
    status: (data.status as UserProgress["status"]) || "not_started",
    xp_earned: Number(data.xp_earned ?? 0),
    attempts_count: Number(data.attempts_count ?? 0),
    first_completed_at: (data.first_completed_at as string | null) ?? null,
    last_attempt_at: (data.last_attempt_at as string | null) ?? null,
    updated_at: data.updated_at as string,
  };
}

export function toAchievement(row: Row): Achievement {
  const data = base(row);
  return {
    id: data.id as string,
    title: data.title as string,
    description: data.description as string,
    icon_name: data.icon_name as string,
    xp_reward: Number(data.xp_reward ?? 0),
    condition_type: data.condition_type as string,
    condition_value: parseJson<Json>(data.condition_value, {}),
    is_active: Boolean(data.is_active ?? true),
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

export function toUserAchievement(row: Row): UserAchievement {
  const data = base(row);
  return {
    id: data.id as string,
    user_id: data.user_id as string,
    achievement_id: data.achievement_id as string,
    earned_at: (data.earned_at as string) ?? data.created_at,
    metadata: parseJson<Json | null>(data.metadata, null),
  };
}

export function toAiGenerationLog(row: Row): AiGenerationLog {
  const data = base(row);
  return {
    id: data.id as string,
    user_id: data.user_id as string,
    generation_type: data.generation_type as AiGenerationLog["generation_type"],
    created_at: data.created_at as string,
    created_date: data.created_date as string,
  };
}

export function serializeJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}
