"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Единая функция для определения состояния авторизации в навигации
 * Переработана для надежной работы с профилем и ролью
 */
function useNavigationAuth() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const pathname = usePathname();
  const [isProtectedRoute, setIsProtectedRoute] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Определяем защищенные маршруты - если мы на такой странице, значит пользователь авторизован
  useEffect(() => {
    const protectedRoutes = [
      "/modules",
      "/dashboard",
      "/leaderboard",
      "/profile",
      "/admin",
    ];
    setIsProtectedRoute(
      protectedRoutes.some((route) => pathname.startsWith(route))
    );
  }, [pathname]);

  // Принудительно обновляем профиль при монтировании, если пользователь авторизован
  useEffect(() => {
    if (user && !profile) {
      // Если пользователь есть, но профиля нет - немедленно обновляем
      refreshProfile().catch(console.error);
    }
    if (profile) {
      setProfileLoaded(true);
    } else if (user) {
      // Если профиль еще не загружен, но пользователь есть - сбрасываем флаг
      setProfileLoaded(false);
    }
  }, [user, profile, refreshProfile]);

  // Если мы на защищенном маршруте, считаем пользователя авторизованным
  // даже если loading=true (сервер уже проверил авторизацию)
  const isAuthenticated = isProtectedRoute || (!!user && !loading);
  
  // showModulesLink: показываем если авторизован И не на страницах авторизации
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const showModulesLink = isAuthenticated && !isAuthRoute;

  // Для роли - используем ТОЛЬКО данные из профиля, строгая проверка
  // Если профиль еще не загружен, ждем его загрузки
  const userRole = profile?.role;
  // Если пользователь на админ-странице, значит он точно админ (сервер уже проверил)
  const isOnAdminRoute = pathname.startsWith("/admin");
  const isAdmin = isOnAdminRoute || Boolean(profile && (userRole === "admin" || userRole === "teacher"));

  // Если пользователь авторизован, но профиль еще загружается - показываем loading
  const isLoadingProfile = isAuthenticated && user && !profile && loading;

  return {
    isAuthenticated,
    showModulesLink,
    user,
    profile,
    loading: isLoadingProfile || (loading && !isProtectedRoute),
    userRole,
    isAdmin,
    profileLoaded,
  };
}

export function Navigation() {
  const { user, profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, showModulesLink, loading, isAdmin, profileLoaded } = useNavigationAuth();

  // Функция для получения инициалов - ТОЛЬКО из фамилии и имени (profile.display_name)
  function getInitials(): string {
    // Инициалы берутся ТОЛЬКО из display_name (фамилия и имя)
    if (profile?.display_name) {
      const trimmed = String(profile.display_name).trim();
      if (trimmed) {
        const parts = trimmed.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
          // Есть фамилия и имя - берем первые буквы
          const firstInitial = parts[0][0] ?? "";
          const secondInitial = parts[1][0] ?? "";
          return `${firstInitial}${secondInitial}`.toUpperCase();
        }
        // Если только одно слово - берем первые две буквы
        if (parts.length === 1 && parts[0].length >= 2) {
          return parts[0].substring(0, 2).toUpperCase();
        }
        // Если только одна буква
        if (parts.length === 1 && parts[0].length === 1) {
          return parts[0].toUpperCase();
        }
      }
    }

    // Если нет display_name - возвращаем заглушку
    return "U";
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          CodeSensei
        </Link>
        <div className="flex items-center gap-4">
          {showModulesLink && (
            <Button variant="ghost" asChild>
              <Link href="/modules">Модули</Link>
            </Button>
          )}
          {/* Кнопка админки: показываем если пользователь авторизован, профиль загружен И роль admin/teacher */}
          {isAuthenticated && profile && user && isAdmin && (
            <Button variant="ghost" asChild>
              <Link href="/admin/modules">Админ-панель</Link>
            </Button>
          )}
          {isAuthenticated ? (
            <>
              <Button variant="ghost" asChild>
                <Link href="/dashboard">Личный кабинет</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/leaderboard">Лидеры</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback 
                        key={`${profile?.id || user?.id || "default"}-${profile?.display_name || user?.email || ""}`}
                        className="text-lg font-semibold"
                      >
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Профиль</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Вызываем signOut - он сам сделает редирект через window.location.href
                      signOut().catch((err) => {
                        console.error("SignOut error:", err);
                        // В случае ошибки все равно редиректим немедленно
                        if (typeof window !== "undefined") {
                          window.location.href = "/login";
                        }
                      });
                    }}
                  >
                    Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            !loading && (
              <Button variant="default" asChild>
                <Link href="/login">Войти</Link>
              </Button>
            )
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
