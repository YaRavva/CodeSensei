"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { UserProfile } from "@/types/db";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface SessionResponse {
  user?: Partial<AuthUser> | null;
  profile?: UserProfile | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(user: Partial<AuthUser>): AuthUser {
  return {
    id: String(user.id ?? ""),
    email: user.email ?? "",
    name: user.name ?? "",
  };
}

/**
 * Загружает текущую сессию с сервера. HttpOnly cookie передается автоматически,
 * поэтому клиент не работает с токенами Appwrite напрямую.
 */
async function fetchSession(): Promise<{ user: AuthUser; profile: UserProfile | null } | null> {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Не удалось загрузить сессию (HTTP ${response.status})`);
  }

  const data = (await response.json()) as SessionResponse;

  if (!data.user?.id) {
    return null;
  }

  return {
    user: normalizeUser(data.user),
    profile: data.profile ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const session = await fetchSession();

        if (!mounted) return;

        setUser(session?.user ?? null);
        setProfile(session?.profile ?? null);
      } catch (error) {
        console.error("[AuthProvider] Ошибка загрузки сессии:", error);
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function refreshProfile() {
    try {
      const session = await fetchSession();
      setUser(session?.user ?? null);
      setProfile(session?.profile ?? null);
    } catch (error) {
      console.error("[AuthProvider] Ошибка обновления профиля:", error);
    }
  }

  async function signOut() {
    // Сбрасываем состояние сразу, чтобы UI обновился без ожидания запроса.
    setUser(null);
    setProfile(null);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } catch (error) {
      console.error("[AuthProvider] Ошибка выхода:", error);
    } finally {
      window.location.href = "/login";
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
