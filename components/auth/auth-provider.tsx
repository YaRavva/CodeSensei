"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";

type UserProfile = Database["public"]["Tables"]["users"]["Row"];

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    // Получаем текущего пользователя
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      setUser(user);
      if (user) {
        loadProfile(user.id);
      } else {
        setLoading(false);
      }
    });

    // Слушаем изменения аутентификации
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = not found, это нормально при первой регистрации
        // 42P17 = infinite recursion - игнорируем, так как это проблема RLS политики
        if (error.code !== "42P17") {
          console.error("Error loading profile:", error);
        }
      }

      setProfile(data ?? null);
    } catch (error: any) {
      // Игнорируем ошибки infinite recursion
      if (error?.code !== "42P17") {
        console.error("Error loading profile:", error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfile() {
    if (user) {
      await loadProfile(user.id);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
