export type Json = | string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
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
          difficulty: 'easy' | 'medium' | 'hard';
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
          difficulty: 'easy' | 'medium' | 'hard';
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
          difficulty?: 'easy' | 'medium' | 'hard';
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
          error_message?: string | null;
          created_at?: string;
        };
      };
      user_progress: {
        Row: {
          id: string;
          user_id: string;
          module_id: string;
          status: 'not_started' | 'in_progress' | 'completed';
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
          status?: 'not_started' | 'in_progress' | 'completed';
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
          status?: 'not_started' | 'in_progress' | 'completed';
          xp_earned?: number;
          attempts_count?: number;
          first_completed_at?: string | null;
          last_attempt_at?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
