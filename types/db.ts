export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * Application-level row shapes. Appwrite stores rows with technical fields
 * (`$id`, `$createdAt`, ...); the repository layer maps them to these objects.
 */
export interface Database {
  public: {
    Tables: {
      achievements: {
        Row: {
          id: string;
          title: string;
          description: string;
          icon_name: string;
          xp_reward: number;
          condition_type: string;
          condition_value: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          icon_name: string;
          xp_reward: number;
          condition_type: string;
          condition_value: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          icon_name?: string;
          xp_reward?: number;
          condition_type?: string;
          condition_value?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          earned_at: string;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          earned_at?: string;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_id?: string;
          earned_at?: string;
          metadata?: Json | null;
        };
      };
      modules: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          topic: string;
          level: number;
          order_index: number;
          is_published: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          topic: string;
          level: number;
          order_index: number;
          is_published?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          topic?: string;
          level?: number;
          order_index?: number;
          is_published?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          description: string;
          starter_code: string;
          solution_code: string | null;
          test_cases: Json;
          xp_reward: number;
          difficulty: "easy" | "medium" | "hard";
          hints: Json | null;
          order_index: number;
          variant_number: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          title: string;
          description: string;
          starter_code: string;
          solution_code?: string | null;
          test_cases: Json;
          xp_reward?: number;
          difficulty: "easy" | "medium" | "hard";
          hints?: Json | null;
          order_index: number;
          variant_number?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          module_id?: string;
          title?: string;
          description?: string;
          starter_code?: string;
          solution_code?: string | null;
          test_cases?: Json;
          xp_reward?: number;
          difficulty?: "easy" | "medium" | "hard";
          hints?: Json | null;
          order_index?: number;
          variant_number?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          role: string;
          avatar_url: string | null;
          total_xp: number;
          current_level: number;
          created_at: string;
          last_active_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          role?: string;
          avatar_url?: string | null;
          total_xp?: number;
          current_level?: number;
          created_at?: string;
          last_active_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          role?: string;
          avatar_url?: string | null;
          total_xp?: number;
          current_level?: number;
          created_at?: string;
          last_active_at?: string | null;
        };
      };
      task_attempts: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          code_solution: string;
          test_results: Json;
          is_successful: boolean;
          used_ai_hint: boolean;
          execution_time_ms: number | null;
          solving_time_ms: number | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id: string;
          code_solution: string;
          test_results: Json;
          is_successful: boolean;
          used_ai_hint?: boolean;
          execution_time_ms?: number | null;
          solving_time_ms?: number | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string;
          code_solution?: string;
          test_results?: Json;
          is_successful?: boolean;
          used_ai_hint?: boolean;
          execution_time_ms?: number | null;
          solving_time_ms?: number | null;
          error_message?: string | null;
          created_at?: string;
        };
      };
      user_progress: {
        Row: {
          id: string;
          user_id: string;
          module_id: string;
          status: "not_started" | "in_progress" | "completed";
          xp_earned: number;
          attempts_count: number;
          first_completed_at: string | null;
          last_attempt_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          module_id: string;
          status?: "not_started" | "in_progress" | "completed";
          xp_earned?: number;
          attempts_count?: number;
          first_completed_at?: string | null;
          last_attempt_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          module_id?: string;
          status?: "not_started" | "in_progress" | "completed";
          xp_earned?: number;
          attempts_count?: number;
          first_completed_at?: string | null;
          last_attempt_at?: string | null;
          updated_at?: string;
        };
      };
      ai_generation_logs: {
        Row: {
          id: string;
          user_id: string;
          generation_type: "module" | "task" | "hint";
          created_at: string;
          created_date: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          generation_type: "module" | "task" | "hint";
          created_at?: string;
          created_date?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          generation_type?: "module" | "task" | "hint";
          created_at?: string;
          created_date?: string;
        };
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

export type UserProfile = Database["public"]["Tables"]["users"]["Row"];
export type Module = Database["public"]["Tables"]["modules"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskAttempt = Database["public"]["Tables"]["task_attempts"]["Row"];
export type UserProgress = Database["public"]["Tables"]["user_progress"]["Row"];
export type Achievement = Database["public"]["Tables"]["achievements"]["Row"];
export type UserAchievement = Database["public"]["Tables"]["user_achievements"]["Row"];
export type AiGenerationLog = Database["public"]["Tables"]["ai_generation_logs"]["Row"];
