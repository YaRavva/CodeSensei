"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";
import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, useRef } from "react";

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
  const loadingProfileRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let hasTriedRestore = false;

    // Функция для восстановления сессии из серверных cookies
    async function restoreSessionFromServer() {
      // Предотвращаем множественные попытки
      if (hasTriedRestore) {
        return false;
      }
      hasTriedRestore = true;
      try {
        console.log("Attempting to restore session from server...");
        const response = await fetch("/api/auth/restore-session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        
        if (response.ok) {
          const { session, error: sessionError } = await response.json();
          
          if (sessionError) {
            console.error("Session restore error from API:", sessionError);
            return false;
          }
          
          if (session?.access_token && session?.refresh_token) {
            console.log("Session tokens received, setting session on client...");
            // Восстанавливаем сессию на клиенте
            const { data, error } = await supabase.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            });
            
            if (error) {
              console.error("Error setting session on client:", error);
              return false;
            }
            
            if (data?.user) {
              console.log("Session restored successfully, user:", data.user.id);
              setUser(data.user);
              // Загружаем профиль и ждем завершения
              // Не устанавливаем loading в false здесь, так как loadProfile сам управляет loading
              await loadProfile(data.user.id);
              // После загрузки профиля убеждаемся, что loading установлен в false
              setLoading(false);
              return true;
            } else {
              console.warn("Session restored but no user data");
              setLoading(false);
              return false;
            }
          } else {
            console.log("No session tokens in response");
            return false;
          }
        } else {
          const errorText = await response.text();
          console.error("Failed to restore session, status:", response.status, errorText);
          return false;
        }
      } catch (error) {
        console.error("Error restoring session from server:", error);
        return false;
      }
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
        // Сессия есть на клиенте - загружаем профиль
        console.log("Session found on client, user:", currentUser.id);
        setUser(currentUser);
        await loadProfile(currentUser.id);
        setLoading(false);
      } else {
        // Сессии нет на клиенте - пытаемся восстановить из серверных cookies
        console.log("No session on client, attempting to restore from server...");
        // Увеличиваем таймаут до 10 секунд для надежности
        const restorePromise = restoreSessionFromServer();
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => {
            console.warn("Session restore timeout");
            resolve(false);
          }, 10000);
        });
        
        const restored = await Promise.race([restorePromise, timeoutPromise]);
        if (!restored) {
          console.warn("Failed to restore session, setting loading to false");
          setLoading(false);
        }
        // Если восстановление успешно, loading уже установлен в false в restoreSessionFromServer
      }
    }).catch((error) => {
      console.error("Unexpected error in getSession:", error);
      if (mounted) {
        setLoading(false);
      }
    });

    // Слушаем изменения аутентификации
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      if (session?.user) {
        // Принудительно загружаем профиль при входе через OAuth
        // Добавляем небольшую задержку, чтобы дать время сессии синхронизироваться
        // Используем setTimeout, чтобы дать время сессии синхронизироваться на клиенте
        setTimeout(async () => {
          if (!mounted) return;
          try {
            await loadProfile(session.user.id);
          } catch (error) {
            console.error("Error loading profile in onAuthStateChange:", error);
            // Убеждаемся, что loading установлен в false даже при ошибке
            setLoading(false);
          }
        }, 100); // Небольшая задержка для синхронизации сессии
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Дополнительная проверка: если после небольшой задержки сессия все еще не восстановлена,
    // пытаемся восстановить еще раз (на случай, если OAuth callback только что произошел)
    const delayedRestore = setTimeout(async () => {
      if (!mounted) return;
      
      // Проверяем, есть ли уже пользователь
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log("Delayed restore: no session found, attempting restore...");
        // Сбрасываем флаг для повторной попытки
        hasTriedRestore = false;
        await restoreSessionFromServer();
      }
    }, 1500); // Проверяем через 1.5 секунды после загрузки

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      clearTimeout(delayedRestore);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile(userId: string) {
    // Защита от множественных одновременных вызовов
    if (loadingProfileRef.current === userId) {
      // Уже загружается для этого пользователя
      return;
    }
    
    try {
      loadingProfileRef.current = userId;
      setLoading(true);
      
      // Проверяем, что пользователь все еще авторизован
      // Используем getUser() вместо getSession(), так как getUser() более надежен
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("Error getting user in loadProfile:", userError);
        setProfile(null);
        setLoading(false);
        loadingProfileRef.current = null;
        return;
      }
      
      if (!authUser || authUser.id !== userId) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        loadingProfileRef.current = null;
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
      loadingProfileRef.current = null;
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
