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
        await loadProfile(currentUser.id);
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
        
        // Для первого входа через OAuth даем немного времени на создание профиля триггером
        if (isOAuthSignIn) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        await loadProfile(session.user.id);
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

      // Используем серверную синхронизацию напрямую
      const response = await fetch("/api/auth/sync-profile", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.ok) {
        const { profile: serverProfile } = await response.json();
        if (serverProfile) {
          console.log(`[AuthProvider] Profile loaded:`, {
            id: serverProfile.id,
            role: serverProfile.role,
            display_name: serverProfile.display_name,
          });
          setProfile(serverProfile as UserProfile);
          return serverProfile as UserProfile;
        }
      }

      console.warn(`[AuthProvider] Profile not found for user ${userId}`);
      setProfile(null);
      return null;
    } catch (error: any) {
      console.error("[AuthProvider] Error loading profile:", {
        error: error.message,
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
      loadingProfileRef.current = null;
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
