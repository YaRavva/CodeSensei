"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    let navigated = false;
    try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error("signIn error", error);
      toast({ title: "Ошибка входа", description: error.message, variant: "destructive" });
      return;
    }

      // Двойная проверка сессии сразу после входа
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        console.error("getSession error", sessionErr);
      }

      const activeSession = sessionData?.session ?? data?.session ?? null;

      if (activeSession) {
        toast({
          title: "Вход выполнен",
          description: "Добро пожаловать в CodeSensei!",
        });
        // Синхронизируем сессию в httpOnly куки через API, чтобы SSR-страницы увидели пользователя
        try {
          await fetch("/api/auth/set-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              access_token: activeSession.access_token,
              refresh_token: activeSession.refresh_token,
            }),
          });
        } catch (syncErr) {
          console.error("Session sync error", syncErr);
        }

        router.replace("/modules");
      router.refresh();
        navigated = true;
        return;
      }

      if (data?.user && !activeSession) {
        toast({
          title: "Требуется подтверждение email",
          description:
            "Мы создали ваш аккаунт, но вход завершится после подтверждения email. Проверьте почту.",
        });
      return;
    }

    toast({ title: "Не удалось войти", description: "Проверьте данные и попробуйте снова" });
    } catch (err: any) {
      console.error("Unexpected login error", err);
      toast({
        title: "Неожиданная ошибка",
        description: err?.message || "Попробуйте снова чуть позже",
        variant: "destructive",
      });
    } finally {
      if (!navigated) {
    setLoading(false);
      }
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({
      title: "Проверьте почту",
      description: "Мы отправили вам ссылку для входа",
    });
    setLoading(false);
  }

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Вход в CodeSensei</CardTitle>
          <CardDescription>Введите email и пароль для входа в систему</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Link href="/forgot-password" className="text-sm text-muted-foreground hover:underline">
              Забыли пароль?
            </Link>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Вход..." : "Войти"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleMagicLink}
              disabled={loading}
            >
              Войти по Magic Link
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Нет аккаунта?{" "}
              <Link href="/register" className="hover:underline">
                Зарегистрироваться
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
