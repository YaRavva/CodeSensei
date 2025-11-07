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

    // Функция для восстановления сессии из серверных cookies
    async function restoreSessionFromServer() {
      try {
        const response = await fetch("/api/auth/restore-session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        
        if (response.ok) {
          const { session } = await response.json();
          if (session?.access_token && session?.refresh_token) {
            // Восстанавливаем сессию на клиенте
            const { data, error } = await supabase.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            });
            
            if (!error && data?.user) {
              setUser(data.user);
              await loadProfile(data.user.id);
              return true;
            }
          }
        }
      } catch (error) {
        console.error("Error restoring session from server:", error);
      }
      return false;
    }

    // Получаем текущую сессию и пользователя
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;
      
      // Если есть ошибка получения сессии, логируем
      if (error) {
        console.error("Error getting session:", error);
      }
      
      const currentUser = data.session?.user ?? null;
      
      if (currentUser) {
        // Сессия есть - загружаем профиль
        setUser(currentUser);
        await loadProfile(currentUser.id);
      } else {
        // Сессии нет на клиенте - пытаемся восстановить из серверных cookies
        // Добавляем таймаут для восстановления (5 секунд)
        const restorePromise = restoreSessionFromServer();
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 5000);
        });
        
        const restored = await Promise.race([restorePromise, timeoutPromise]);
        if (!restored) {
          setLoading(false);
        }
      }
    }).catch((error) => {
      console.error("Unexpected error in getSession:", error);
      if (mounted) {
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
      
      // Проверяем, что пользователь все еще авторизован
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== userId) {
        console.warn("User session expired while loading profile");
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      
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
          // При критических ошибках не сбрасываем профиль, чтобы не потерять данные
          if (error.code === "42501" || error.code === "PGRST301") {
            // Ошибка доступа - возможно проблема с RLS
            console.error("RLS policy error - user may not have access to their profile");
          }
        }
      }

      const typedData = data as UserProfile | null;

      if (!typedData) {
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

        const { data: inserted, error: insertError } = await (supabase
          .from("users") as any)
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
        if (!typedData.role) {
          console.warn(`Profile for user ${userId} has no role, setting to 'student'`);
          const { data: updated } = await (supabase
            .from("users") as any)
            .update({ role: "student" })
            .eq("id", userId)
            .select("id, email, role, display_name, avatar_url, total_xp, current_level, created_at, last_active_at")
            .maybeSingle();
          setProfile((updated as UserProfile | null) ?? typedData);
        } else {
          setProfile(typedData);
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
      
      // Принудительная очистка всех кук через document.cookie
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
      
      // НЕМЕДЛЕННЫЙ редирект - сразу после очистки storage
      // Используем window.location.href для гарантированного редиректа
      window.location.href = "/login";
    }
    
    // Параллельно очищаем клиентские токены Supabase и серверные куки (не блокируем редирект)
    Promise.allSettled([
      supabase.auth.signOut(),
      fetch("/api/auth/signout", { 
        method: "POST", 
        credentials: "include",
        cache: "no-store"
      }).catch((e) => {
        console.error("Server signout error:", e);
      })
    ]).catch((error) => {
      console.error("SignOut error:", error);
    });
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
