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

    // Получаем текущую сессию и пользователя
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadProfile(currentUser.id);
      } else {
        setLoading(false);
      }
    });

    // Слушаем изменения аутентификации
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile(userId: string) {
    try {
      setLoading(true);
      
      // Используем более надежный запрос с явным указанием полей
      const { data, error } = await supabase
        .from("users")
        .select("id, email, role, display_name, avatar_url, total_xp, current_level, created_at, last_active_at")
        .eq("id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = not found, это нормально при первой регистрации
        // 42P17 = infinite recursion - игнорируем, так как это проблема RLS политики
        if (error.code !== "42P17") {
          console.error("Error loading profile:", error);
        }
      }

      if (!data) {
        // Создаем запись профиля при первом входе
        const authUser = (await supabase.auth.getUser()).data.user;
        const roleFromAuth = (
          (authUser?.app_metadata as any)?.user_role ||
          (authUser?.app_metadata as any)?.role ||
          (authUser?.user_metadata as any)?.role ||
          "student"
        ) as string;
        const email = authUser?.email ?? null;
        const displayName =
          (authUser?.user_metadata as any)?.full_name ||
          (authUser?.user_metadata as any)?.name ||
          null;

        const { data: inserted, error: insertError } = await supabase
          .from("users")
          .insert({ id: userId, email, role: roleFromAuth, display_name: displayName })
          .select("id, email, role, display_name, avatar_url, total_xp, current_level, created_at, last_active_at")
          .maybeSingle();

        if (insertError) {
          console.error("Error creating user profile:", insertError);
          setProfile(null);
        } else {
          setProfile(inserted ?? null);
        }
      } else {
        // Убеждаемся что роль точно установлена
        if (!data.role) {
          console.warn(`Profile for user ${userId} has no role, setting to 'student'`);
          const { data: updated } = await supabase
            .from("users")
            .update({ role: "student" })
            .eq("id", userId)
            .select("id, email, role, display_name, avatar_url, total_xp, current_level, created_at, last_active_at")
            .maybeSingle();
          setProfile(updated ?? data);
        } else {
          setProfile(data);
        }
      }
    } catch (error: any) {
      // Игнорируем ошибки infinite recursion
      if (error?.code !== "42P17") {
        console.error("Error loading profile:", error);
      }
      setProfile(null);
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
    // Очищаем состояние сразу, чтобы UI обновился
    setUser(null);
    setProfile(null);
    
    try {
      // Очищаем клиентские токены Supabase
      await supabase.auth.signOut();
      
      // Очищаем все localStorage и sessionStorage связанные с Supabase
      if (typeof window !== "undefined") {
        // Очищаем все ключи, связанные с Supabase
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Очищаем sessionStorage
        const sessionKeysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
            sessionKeysToRemove.push(key);
          }
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      }
      
      // Очищаем серверные httpOnly куки
      try {
        await fetch("/api/auth/signout", { 
          method: "POST", 
          credentials: "include",
          cache: "no-store"
        });
      } catch (e) {
        console.error("Server signout error:", e);
      }

      // Принудительная очистка всех кук через document.cookie
      if (typeof document !== "undefined") {
        const cookies = document.cookie.split(";");
        const domain = window.location.hostname;
        const path = "/";
        
        cookies.forEach(cookie => {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          
          // Удаляем все куки, связанные с Supabase или auth
          if (name.startsWith('sb-') || name.includes('auth') || name.includes('supabase')) {
            // Удаляем для текущего домена
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}`;
            // Удаляем для домена без www
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=${domain}`;
            // Удаляем для домена с www
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=.${domain}`;
          }
        });
      }
      
      // Небольшая задержка перед редиректом, чтобы куки успели очиститься
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Редирект на страницу входа с полной перезагрузкой
      if (typeof window !== "undefined") {
        // Используем href вместо replace для гарантированной очистки
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("SignOut error:", error);
      // В случае ошибки все равно редиректим
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
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
