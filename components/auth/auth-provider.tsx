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
        console.error("Error getting session:", error);
      }

      const currentUser = data.session?.user ?? null;

      if (currentUser) {
        setUser(currentUser);
        await loadProfile(currentUser.id);
      }
      setLoading(false);
    }).catch((error) => {
      console.error("Unexpected error in getSession:", error);
      if (mounted) {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
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
    if (loadingProfileRef.current === userId) {
      return;
    }

    try {
      loadingProfileRef.current = userId;
      setLoading(true);

      let retries = 0;
      const maxRetries = 3;
      let profileData = null;
      let lastError: any = null;

      while (retries < maxRetries && !profileData) {
        const { data, error } = await supabase
          .from("users")
          .select("id, email, role, display_name, avatar_url, total_xp, current_level, created_at, last_active_at")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          // PGRST116 - это "not found", что нормально при первой загрузке (триггер может еще не сработать)
          if (error.code !== "PGRST116") {
            console.error(`Error loading profile (attempt ${retries + 1}/${maxRetries}):`, {
              code: error.code,
              message: error.message,
              details: error.details,
            });
            lastError = error;
          }
        }

        if (data) {
          profileData = data;
          break;
        } else if (retries < maxRetries - 1) {
          // Увеличиваем задержку с каждой попыткой (500ms, 1000ms, 1500ms)
          await new Promise(resolve => setTimeout(resolve, 500 * (retries + 1)));
          retries++;
        } else {
          // После всех попыток профиль не найден
          if (!lastError || lastError.code === "PGRST116") {
            console.warn(`Profile not found for user ${userId} after ${maxRetries} attempts. This may indicate that the database trigger hasn't created the profile yet.`);
          }
          break;
        }
      }

      setProfile(profileData || null);
    } catch (error: any) {
      console.error("Unexpected error loading profile:", {
        error: error.message,
        stack: error.stack,
        userId,
      });
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
