"use client";

import { Menu, User as UserIcon, X } from "lucide-react";
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

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

/**
 * Единая функция для определения состояния авторизации в навигации.
 */
function useNavigationAuth() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const pathname = usePathname();
  const [isProtectedRoute, setIsProtectedRoute] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Определяем защищенные маршруты: если мы на такой странице, сервер уже проверил авторизацию
  useEffect(() => {
    const protectedRoutes = ["/modules", "/dashboard", "/leaderboard", "/profile", "/admin"];
    setIsProtectedRoute(protectedRoutes.some((route) => pathname.startsWith(route)));
  }, [pathname]);

  // Профиль мог не успеть загрузиться: пробуем несколько раз с увеличивающейся задержкой
  useEffect(() => {
    if (user && !profile && !loading) {
      const refreshAttempts = [500, 1500, 3000];
      refreshAttempts.forEach((delay) => {
        setTimeout(() => {
          if (user && !profile) {
            refreshProfile().catch((err) => {
              console.error("[Navigation] Не удалось обновить профиль:", err);
            });
          }
        }, delay);
      });
    }
    if (profile) {
      setProfileLoaded(true);
    } else if (user) {
      setProfileLoaded(false);
    }
  }, [user, profile, loading, refreshProfile]);

  const isAuthenticated = isProtectedRoute || (!!user && !loading);
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const showModulesLink = isAuthenticated && !isAuthRoute;

  const userRole = profile?.role;
  const isOnAdminRoute = pathname.startsWith("/admin");
  const isAdmin =
    isOnAdminRoute || Boolean(profile && (userRole === "admin" || userRole === "teacher"));

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

  // Escape закрывает мобильное меню, фон не прокручивается под ним
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  // Функция для получения инициалов - ТОЛЬКО из фамилии и имени (profile.display_name)
  function getInitials(): string {
    if (profile?.display_name) {
      const trimmed = String(profile.display_name).trim();
      if (trimmed) {
        const parts = trimmed.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
          const firstInitial = parts[0][0] ?? "";
          const secondInitial = parts[1][0] ?? "";
          return `${firstInitial}${secondInitial}`.toUpperCase();
        }
        if (parts.length === 1 && parts[0].length >= 2) {
          return parts[0].substring(0, 2).toUpperCase();
        }
        if (parts.length === 1 && parts[0].length === 1) {
          return parts[0].toUpperCase();
        }
      }
    }

    const fallback = (user?.name || user?.email || "").trim();
    return fallback ? fallback[0].toUpperCase() : "";
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
      "rounded-md px-3 py-2 text-sm font-semibold transition-colors duration-300",
      EASE,
      isPathActive(pathname, href)
        ? "bg-secondary text-foreground"
        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
    );

  return (
    <header className="sticky top-0 z-50 px-4 pt-3 md:pt-4">
      <nav
        aria-label="Основная навигация"
        className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 rounded-2xl border bg-background/80 px-3 backdrop-blur-md md:px-4"
      >
        <Link
          href={isAuthenticated ? "/modules" : "/"}
          className="rounded-md px-2 text-lg font-bold tracking-tight"
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
                        {getInitials() || <UserIcon className="h-5 w-5" aria-hidden="true" />}
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
                      signOut().catch((err) => {
                        console.error("SignOut error:", err);
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

          {/* Mobile menu toggle: иконка перетекает между состояниями (B7) */}
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="relative size-5">
                <Menu
                  className={cn(
                    "absolute inset-0 size-5 transition-[transform,opacity] duration-500",
                    EASE,
                    menuOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
                  )}
                />
                <X
                  className={cn(
                    "absolute inset-0 size-5 transition-[transform,opacity] duration-500",
                    EASE,
                    menuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
                  )}
                />
              </span>
              <span className="sr-only">{menuOpen ? "Закрыть меню" : "Открыть меню"}</span>
            </Button>
          )}
        </div>
      </nav>

      {/* Мобильное меню: полноэкранная панель на базовой поверхности с сильным блюром (B7) */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background/95 px-6 pt-24 pb-8 backdrop-blur-xl md:hidden"
        >
          <div className="flex flex-col gap-1">
            {links.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isPathActive(pathname, link.href) ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "rounded-lg px-4 py-3 text-lg font-semibold text-foreground transition-colors duration-300",
                  EASE,
                  "hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isPathActive(pathname, link.href) ? "bg-secondary" : ""
                )}
                style={{
                  animation: `menu-item-in 400ms cubic-bezier(0.22,1,0.36,1) ${Math.min(index * 60, 360)}ms both`,
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div
            className="mt-4 border-t pt-4"
            style={{ animation: "menu-item-in 400ms cubic-bezier(0.22,1,0.36,1) 300ms both" }}
          >
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-lg font-semibold text-foreground transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-secondary/60"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback
                  key={`${profile?.id || user?.id || "default"}-${profile?.display_name || user?.email || ""}`}
                  className="bg-primary text-xs font-semibold text-primary-foreground"
                >
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              Профиль
            </Link>
            <button
              type="button"
              onClick={() => {
                signOut().catch(() => {
                  if (typeof window !== "undefined") {
                    window.location.href = "/login";
                  }
                });
              }}
              className="mt-1 w-full rounded-lg px-4 py-3 text-left text-lg font-semibold text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-secondary/60 hover:text-foreground"
            >
              Выйти
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
