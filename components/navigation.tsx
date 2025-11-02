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

export function Navigation() {
  const { user, profile, signOut } = useAuth();

  return (
    <nav className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          CodeSensei
        </Link>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/modules">Модули</Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" asChild>
                <Link href="/dashboard">Дашборд</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/leaderboard">Лидеры</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {profile?.display_name?.[0]?.toUpperCase() ??
                          profile?.email?.[0]?.toUpperCase() ??
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Профиль</Link>
                  </DropdownMenuItem>
                  {profile?.role === "admin" || profile?.role === "teacher" ? (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/modules">Админ-панель</Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>Выйти</DropdownMenuItem>
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
