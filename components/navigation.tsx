"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";

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
    const protectedRoutes = ["/modules", "/dashboard", "/leaderboard", "/profile", "/admin"];
    setIsProtectedRoute(protectedRoutes.some((route) => pathname.startsWith(route)));
  }, [pathname]);

  // Принудительно обновляем профиль при монтировании, если пользователь авторизован
  useEffect(() => {
    if (user && !profile && !loading) {
      // Если пользователь есть, но профиля нет и не идет загрузка - обновляем
      console.log("[Navigation] User exists but profile is missing, refreshing...");
      // Пробуем несколько раз с увеличивающейся задержкой
      const refreshAttempts = [500, 1500, 3000];
      refreshAttempts.forEach((delay, index) => {
        setTimeout(() => {
          if (user && !profile) {
            console.log(
              `[Navigation] Refresh attempt ${index + 1}/${refreshAttempts.length} after ${delay}ms`
            );
            refreshProfile().catch((err) => {
              console.error(`[Navigation] Error refreshing profile (attempt ${index + 1}):`, err);
            });
          }
        }, delay);
      });
    }
    if (profile) {
      setProfileLoaded(true);
      console.log("[Navigation] Profile loaded:", {
        role: profile.role,
        display_name: profile.display_name,
      });
    } else if (user) {
      // Если профиль еще не загружен, но пользователь есть - сбрасываем флаг
      setProfileLoaded(false);
    }
  }, [user, profile, loading, refreshProfile]);

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
  const isAdmin =
    isOnAdminRoute || Boolean(profile && (userRole === "admin" || userRole === "teacher"));

  // Логирование для диагностики
  useEffect(() => {
    console.log("[Navigation] Auth state update:", {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      hasProfile: !!profile,
      profileId: profile?.id,
      profileRole: profile?.role,
      profileDisplayName: profile?.display_name,
      isOnAdminRoute,
      isAdmin,
      pathname,
      loading,
    });

    if (user && !profile) {
      console.warn("[Navigation] User exists but profile is missing!");
    }
  }, [user, profile, isOnAdminRoute, isAdmin, pathname, loading]);

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

interface NavLink {
  href: string;
  label: string;
}

function isPathActive(pathname: string, href: string): boolean {
  if (href === "/modules") {
    return pathname === "/modules" || pathname.startsWith("/modules/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navigation() {
  const { user, profile, signOut } = useAuth();
  const pathname = usePathname();
  const { isAuthenticated, showModulesLink, loading, isAdmin } = useNavigationAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Закрываем мобильное меню при смене маршрута
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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

  const links: NavLink[] = [
    ...(showModulesLink ? [{ href: "/modules", label: "Модули" }] : []),
    ...(isAuthenticated
      ? [
          { href: "/dashboard", label: "Личный кабинет" },
          { href: "/leaderboard", label: "Лидеры" },
          { href: "/achievements", label: "Достижения" },
        ]
      : []),
    ...(isAdmin ? [{ href: "/admin/modules", label: "Админ-панель" }] : []),
  ];

  const activeLink = (href: string) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200",
      isPathActive(pathname, href)
        ? "bg-secondary text-foreground"
        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
    );

  return (
    <header className="sticky top-0 z-50 px-4 pt-3 md:pt-4">
      <nav
        aria-label="Основная навигация"
        className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 rounded-2xl border bg-background/80 px-3 shadow-sm backdrop-blur-md md:px-4"
      >
        <Link
          href={isAuthenticated ? "/modules" : "/"}
          className="px-2 text-lg font-bold tracking-tight"
        >
          CodeSensei
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isPathActive(pathname, link.href) ? "page" : undefined}
              className={activeLink(link.href)}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />

          {!isAuthenticated && !loading && (
            <Button asChild variant="ghost" className="rounded-md">
              <Link href="/login">Войти</Link>
            </Button>
          )}
          {isAuthenticated && (
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback
                        key={`${profile?.id || user?.id || "default"}-${profile?.display_name || user?.email || ""}`}
                        className="bg-primary text-sm font-semibold text-primary-foreground"
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
            </div>
          )}

          {/* Mobile menu toggle */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              <span className="sr-only">{menuOpen ? "Закрыть меню" : "Открыть меню"}</span>
            </Button>
          )}
        </div>
      </nav>

      {/* Mobile menu: full-height panel */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="mx-auto mt-2 max-w-5xl overflow-hidden rounded-2xl border bg-background/90 backdrop-blur-md md:hidden"
        >
          <div className="flex flex-col p-2">
            {links.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isPathActive(pathname, link.href) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-4 py-3 text-base font-medium text-foreground transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-secondary/60",
                  isPathActive(pathname, link.href) ? "bg-secondary" : ""
                )}
                style={{
                  transitionDelay: `${Math.min(index * 60, 360)}ms`,
                }}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-1 border-t p-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start px-4 py-3">
                    <Avatar className="mr-3 h-8 w-8">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback
                        key={`${profile?.id || user?.id || "default"}-${profile?.display_name || user?.email || ""}`}
                        className="bg-primary text-xs font-semibold text-primary-foreground"
                      >
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <span>Профиль</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Профиль</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      signOut().catch(() => {
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
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
