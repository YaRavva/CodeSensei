export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          condition_type: string;
          condition_value: Json | null;
          created_at: string | null;
          description: string;
          icon_name: string;
          id: string;
          is_active: boolean | null;
          title: string;
          xp_reward: number;
        };
        Insert: {
          condition_type: string;
          condition_value?: Json | null;
          created_at?: string | null;
          description: string;
          icon_name: string;
          id?: string;
          is_active?: boolean | null;
          title: string;
          xp_reward: number;
        };
        Update: {
          condition_type?: string;
          condition_value?: Json | null;
          created_at?: string | null;
          description?: string;
          icon_name?: string;
          id?: string;
          is_active?: boolean | null;
          title?: string;
          xp_reward?: number;
        };
        Relationships: [];
      };
      leaderboard_cache: {
        Row: {
          id: string;
          period: string;
          rank: number;
          updated_at: string | null;
          user_id: string;
          xp: number;
        };
        Insert: {
          id?: string;
          period: string;
          rank: number;
          updated_at?: string | null;
          user_id: string;
          xp: number;
        };
        Update: {
          id?: string;
          period?: string;
          rank?: number;
          updated_at?: string | null;
          user_id?: string;
          xp?: number;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_cache_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          created_at: string | null;
          estimated_duration: number | null;
          id: string;
          is_published: boolean | null;
          module_id: string;
          order_index: number;
          theory_content: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          estimated_duration?: number | null;
          id?: string;
          is_published?: boolean | null;
          module_id: string;
          order_index: number;
          theory_content?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          estimated_duration?: number | null;
          id?: string;
          is_published?: boolean | null;
          module_id?: string;
          order_index?: number;
          theory_content?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      modules: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          id: string;
          is_published: boolean | null;
          level: number;
          order_index: number;
          title: string;
          topic: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_published?: boolean | null;
          level: number;
          order_index: number;
          title: string;
          topic: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_published?: boolean | null;
          level?: number;
          order_index?: number;
          title?: string;
          topic?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "modules_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      task_attempts: {
        Row: {
          code_solution: string;
          created_at: string | null;
          error_message: string | null;
          execution_time_ms: number | null;
          id: string;
          is_successful: boolean;
          task_id: string;
          test_results: Json | null;
          used_ai_hint: boolean | null;
          user_id: string;
        };
        Insert: {
          code_solution: string;
          created_at?: string | null;
          error_message?: string | null;
          execution_time_ms?: number | null;
          id?: string;
          is_successful: boolean;
          task_id: string;
          test_results?: Json | null;
          used_ai_hint?: boolean | null;
          user_id: string;
        };
        Update: {
          code_solution?: string;
          created_at?: string | null;
          error_message?: string | null;
          execution_time_ms?: number | null;
          id?: string;
          is_successful?: boolean;
          task_id?: string;
          test_results?: Json | null;
          used_ai_hint?: boolean | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_attempts_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          created_at: string | null;
          description: string;
          difficulty: string;
          hints: Json | null;
          id: string;
          lesson_id: string;
          order_index: number;
          solution_code: string | null;
          starter_code: string;
          test_cases: Json;
          title: string;
          updated_at: string | null;
          xp_reward: number | null;
        };
        Insert: {
          created_at?: string | null;
          description: string;
          difficulty: string;
          hints?: Json | null;
          id?: string;
          lesson_id: string;
          order_index: number;
          solution_code?: string | null;
          starter_code: string;
          test_cases?: Json;
          title: string;
          updated_at?: string | null;
          xp_reward?: number | null;
        };
        Update: {
          created_at?: string | null;
          description?: string;
          difficulty?: string;
          hints?: Json | null;
          id?: string;
          lesson_id?: string;
          order_index?: number;
          solution_code?: string | null;
          starter_code?: string;
          test_cases?: Json;
          title?: string;
          updated_at?: string | null;
          xp_reward?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      user_achievements: {
        Row: {
          achievement_id: string;
          earned_at: string | null;
          id: string;
          user_id: string;
        };
        Insert: {
          achievement_id: string;
          earned_at?: string | null;
          id?: string;
          user_id: string;
        };
        Update: {
          achievement_id?: string;
          earned_at?: string | null;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_progress: {
        Row: {
          attempts_count: number | null;
          first_completed_at: string | null;
          id: string;
          last_attempt_at: string | null;
          lesson_id: string;
          status: string;
          updated_at: string | null;
          user_id: string;
          xp_earned: number | null;
        };
        Insert: {
          attempts_count?: number | null;
          first_completed_at?: string | null;
          id?: string;
          last_attempt_at?: string | null;
          lesson_id: string;
          status?: string;
          updated_at?: string | null;
          user_id: string;
          xp_earned?: number | null;
        };
        Update: {
          attempts_count?: number | null;
          first_completed_at?: string | null;
          id?: string;
          last_attempt_at?: string | null;
          lesson_id?: string;
          status?: string;
          updated_at?: string | null;
          user_id?: string;
          xp_earned?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_progress_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          current_level: number | null;
          display_name: string | null;
          email: string | null;
          id: string;
          last_active_at: string | null;
          role: string;
          total_xp: number | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          current_level?: number | null;
          display_name?: string | null;
          email?: string | null;
          id: string;
          last_active_at?: string | null;
          role?: string;
          total_xp?: number | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          current_level?: number | null;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          last_active_at?: string | null;
          role?: string;
          total_xp?: number | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calculate_user_level: { Args: { total_xp: number }; Returns: number };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
