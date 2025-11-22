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

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.error("[AuthProvider] Error getting session:", error);
      }

      const currentUser = data.session?.user ?? null;

      if (currentUser) {
        setUser(currentUser);
        const loadedProfile = await loadProfile(currentUser.id);
        
        // Если профиль не загрузился, пробуем синхронизацию через API
        if (!loadedProfile) {
          console.log("[AuthProvider] Profile not loaded on initial mount, trying server sync...");
          setTimeout(async () => {
            if (!mounted) return;
            try {
              const response = await fetch("/api/auth/sync-profile", {
                method: "GET",
                credentials: "include",
                cache: "no-store",
              });
              if (response.ok) {
                const { profile: serverProfile } = await response.json();
                if (serverProfile && mounted) {
                  console.log("[AuthProvider] Profile synced from server on mount:", serverProfile);
                  setProfile(serverProfile);
                }
              }
            } catch (error) {
              console.error("[AuthProvider] Error syncing profile on mount:", error);
            }
          }, 2000);
        }
      }
      setLoading(false);
    }).catch((error) => {
      console.error("[AuthProvider] Unexpected error in getSession:", error);
      if (mounted) {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log(`[AuthProvider] Auth state changed: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id,
      });

      setUser(session?.user ?? null);
      if (session?.user) {
        const isOAuthSignIn = event === "SIGNED_IN";
        
        // Сначала пытаемся загрузить профиль без задержки (для повторных входов профиль уже есть)
        let loadedProfile = await loadProfile(session.user.id);
        
        // Только если профиль не найден И это первый вход через OAuth - ждем создания профиля триггером
        if (isOAuthSignIn && !loadedProfile) {
          console.log("[AuthProvider] OAuth sign in detected, profile not found - waiting for profile creation (first login)...");
          // Для первого входа через OAuth даем время на создание профиля триггером
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Пробуем загрузить еще раз после задержки
          loadedProfile = await loadProfile(session.user.id);
        }
        
        // Если профиль все еще не загружен после всех попыток, пробуем синхронизацию через API
        if (!loadedProfile) {
          console.log("[AuthProvider] Profile still missing, trying server sync...");
          setTimeout(async () => {
            try {
              const response = await fetch("/api/auth/sync-profile", {
                method: "GET",
                credentials: "include",
                cache: "no-store",
              });
              if (response.ok) {
                const { profile: serverProfile } = await response.json();
                if (serverProfile) {
                  console.log("[AuthProvider] Profile synced from server:", serverProfile);
                  setProfile(serverProfile);
                }
              } else {
                console.warn("[AuthProvider] Server sync failed, status:", response.status);
              }
            } catch (error) {
              console.error("[AuthProvider] Error syncing profile:", error);
            }
          }, 2000);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Периодически проверяем профиль, если он не загружен
    const profileCheckInterval = setInterval(() => {
      if (!mounted) {
        clearInterval(profileCheckInterval);
        return;
      }
      
      if (user && !profile && !loading) {
        console.log("[AuthProvider] Periodic check: profile missing, attempting refresh...");
        refreshProfile().catch(console.error);
      }
    }, 5000); // Проверяем каждые 5 секунд

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      clearInterval(profileCheckInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile(userId: string): Promise<UserProfile | null> {
    if (loadingProfileRef.current === userId) {
      return null;
    }

    try {
      loadingProfileRef.current = userId;
      setLoading(true);

      let retries = 0;
      const maxRetries = 8; // Увеличиваем количество попыток для OAuth
      let profileData = null;
      let lastError: any = null;

      while (retries < maxRetries && !profileData) {
        // Проверяем сессию перед запросом
        const { data: sessionData } = await supabase.auth.getSession();
        console.log(`[AuthProvider] Attempt ${retries + 1}/${maxRetries} - Session check:`, {
          hasSession: !!sessionData.session,
          sessionUserId: sessionData.session?.user?.id,
          requestedUserId: userId,
          match: sessionData.session?.user?.id === userId,
        });

        const { data, error } = await supabase
          .from("users")
          .select("id, email, role, display_name, avatar_url, total_xp, current_level, created_at, last_active_at")
          .eq("id", userId)
          .maybeSingle();

        const typedData = data as UserProfile | null;
        console.log(`[AuthProvider] Query result (attempt ${retries + 1}/${maxRetries}):`, {
          hasData: !!typedData,
          hasError: !!error,
          errorCode: error?.code,
          errorMessage: error?.message,
          dataPreview: typedData ? { id: typedData.id, email: typedData.email, role: typedData.role } : null,
        });

        if (error) {
          // PGRST116 - это "not found", что нормально при первой загрузке (триггер может еще не сработать)
          if (error.code !== "PGRST116") {
            console.error(`[AuthProvider] Error loading profile (attempt ${retries + 1}/${maxRetries}):`, {
              code: error.code,
              message: error.message,
              details: error.details,
              hint: error.hint,
              userId,
            });
            lastError = error;
          } else {
            // Логируем даже PGRST116 для диагностики
            console.log(`[AuthProvider] Profile not found (attempt ${retries + 1}/${maxRetries}) for user ${userId}`);
          }
        }

        if (typedData) {
          console.log(`[AuthProvider] Profile loaded successfully for user ${userId}:`, {
            id: typedData.id,
            email: typedData.email,
            role: typedData.role,
            display_name: typedData.display_name,
            avatar_url: typedData.avatar_url,
          });
          profileData = typedData;
          break;
        } else if (retries < maxRetries - 1) {
          // Увеличиваем задержку с каждой попыткой (500ms, 1000ms, 1500ms, 2000ms, 2500ms, 3000ms, 3500ms, 4000ms)
          const delay = 500 * (retries + 1);
          console.log(`[AuthProvider] Retrying profile load in ${delay}ms (attempt ${retries + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
        } else {
          // После всех попыток профиль не найден
          if (!lastError || lastError.code === "PGRST116") {
            console.warn(`[AuthProvider] Profile not found for user ${userId} after ${maxRetries} attempts. This may indicate that the database trigger hasn't created the profile yet.`);
          }
          break;
        }
      }

      if (profileData) {
        console.log(`[AuthProvider] Setting profile state for user ${userId}:`, {
          id: profileData.id,
          role: profileData.role,
          display_name: profileData.display_name,
        });
        setProfile(profileData);
        // Проверяем, что состояние действительно обновилось
        setTimeout(() => {
          console.log(`[AuthProvider] Profile state after setProfile - should be set now`);
        }, 100);
        return profileData;
      } else {
        console.warn(`[AuthProvider] Profile not found after ${maxRetries} attempts, setting profile to null for user ${userId}`);
        setProfile(null);
        return null;
      }
    } catch (error: any) {
      console.error("[AuthProvider] Unexpected error loading profile:", {
        error: error.message,
        stack: error.stack,
        userId,
      });
      setProfile(null);
      return null;
    } finally {
      setLoading(false);
      loadingProfileRef.current = null;
    }
  }

  async function refreshProfile() {
    if (user) {
      console.log(`[AuthProvider] refreshProfile called for user ${user.id}`);
      // Сбрасываем ref, чтобы можно было загрузить профиль заново
      loadingProfileRef.current = null;
      
      // Пробуем загрузить через API endpoint (серверная загрузка)
      try {
        const response = await fetch("/api/auth/sync-profile", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        
        if (response.ok) {
          const { profile: serverProfile } = await response.json();
          if (serverProfile) {
            console.log("[AuthProvider] Profile synced from server:", serverProfile);
            setProfile(serverProfile);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.warn("[AuthProvider] Failed to sync profile from server, falling back to client load:", error);
      }
      
      // Fallback на клиентскую загрузку
      await loadProfile(user.id);
    } else {
      console.warn("[AuthProvider] refreshProfile called but user is null");
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
