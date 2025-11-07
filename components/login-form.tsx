"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
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

  async function handleGoogleLogin() {
    setLoading(true);
    // Используем переменную окружения, если она есть, иначе window.location.origin
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${baseUrl}/auth/callback`,
      },
    });

    if (error) {
      toast({
        title: "Ошибка входа через Google",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  }

  async function handleGithubLogin() {
    setLoading(true);
    // Используем переменную окружения, если она есть, иначе window.location.origin
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${baseUrl}/auth/callback`,
      },
    });

    if (error) {
      toast({
        title: "Ошибка входа через GitHub",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Добро пожаловать</h1>
                <p className="text-muted-foreground text-balance">
                  Войдите в свой аккаунт CodeSensei
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="email">Email</Label>
                    <Link
                      href="/forgot-password"
                      className="ml-auto text-sm text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Забыли пароль?
                    </Link>
                  </div>
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
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Вход..." : "Войти"}
                </Button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Или</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="sr-only">Войти через Google</span>
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGithubLogin}
                  disabled={loading}
                  className="w-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23 1.957-.538 4.04-.538 6.097 0 2.292-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span className="sr-only">Войти через GitHub</span>
                  GitHub
                </Button>
              </div>
              
              <p className="text-center text-sm text-muted-foreground">
                Нет аккаунта?{" "}
                <Link href="/register" className="text-primary hover:underline font-medium">
                  Зарегистрироваться
                </Link>
              </p>
            </div>
          </form>
          
          <div className="bg-muted relative hidden md:block overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                style={{ 
                  transform: 'scale(2)', 
                  transformOrigin: 'center',
                  maskImage: 'url(/CodeSensei.svg)',
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskImage: 'url(/CodeSensei.svg)',
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  backgroundColor: 'var(--primary)',
                  width: '320px',
                  height: '320px',
                  minWidth: '320px',
                  minHeight: '320px'
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

