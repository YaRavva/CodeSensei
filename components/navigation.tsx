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
import { usePathname } from "next/navigation";

export function Navigation() {
  const { user, profile, signOut, loading } = useAuth();
  const pathname = usePathname();
  const computedRole = profile?.role as string | undefined;
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const hideModulesLink = isAuthRoute;
  const isAuthenticated = !!user && !loading && !isAuthRoute;

  function getInitials(): string {
    const nameSource =
      profile?.display_name ||
      (user?.user_metadata as any)?.full_name ||
      (user?.user_metadata as any)?.name ||
      user?.email ||
      "";

    const trimmed = String(nameSource).trim();
    if (!trimmed) return "U";

    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }
    const token = parts[0] || trimmed;
    const letters = token.replace(/@.*/, "");
    const a = letters[0] ?? "U";
    const b = letters[1] ?? "";
    return `${a}${b}`.toUpperCase();
  }

  return (
    <nav className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <span className="block h-16 overflow-hidden leading-none">
            <img src="/CodeSensei.svg" alt="" aria-hidden className="h-28 w-auto -my-6" />
          </span>
          <span>CodeSensei</span>
        </Link>
        <div className="flex items-center gap-4">
          {!hideModulesLink && (
            <Button variant="ghost" asChild>
              <Link href="/modules">Модули</Link>
            </Button>
          )}
          {isAuthenticated && computedRole === "admin" && (
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
                      <AvatarFallback>{getInitials()}</AvatarFallback>
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
                      void signOut();
                    }}
                  >
                    Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button variant="default" asChild>
              <Link href="/login">Войти</Link>
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
