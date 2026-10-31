"use client";

import { CheckCircle2, Clock, Database, Gauge } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { KatanaLogo } from "@/components/brand-logo";
import { OAuthButtons } from "@/components/oauth-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { validateEmail } from "@/lib/utils/validation";

interface ErrorResponse {
  error?: string;
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const failed = new URLSearchParams(window.location.search).get("oauth");
    if (failed === "failed") {
      toast({
        title: "Вход через OAuth не удался",
        description: "Не удалось войти через внешний провайдер. Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  }, [toast]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const nextEmailError = validateEmail(email);
    const nextPasswordError = password ? null : "Введите пароль";

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    if (nextEmailError || nextPasswordError) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as ErrorResponse | null;
        toast({
          title: "Ошибка входа",
          description: data?.error || "Неверная почта или пароль",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Вход выполнен",
        description: "Продолжаем с того места, где вы остановились",
      });

      router.push("/modules");
      router.refresh();
    } catch (error) {
      console.error("Unexpected login error", error);
      toast({
        title: "Неожиданная ошибка",
        description: "Не удалось войти. Попробуйте ещё раз через минуту",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6" onSubmit={handleLogin} noValidate>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Добро пожаловать</h1>
                <p className="text-sm text-muted-foreground">Войдите в свой аккаунт CodeSensei</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="email">Email</Label>
                    <Link
                      href="/forgot-password"
                      className="ml-auto rounded-sm text-xs text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Забыли пароль?
                    </Link>
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    onBlur={() => setEmailError(validateEmail(email))}
                    required
                    disabled={loading}
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "email-error" : undefined}
                    className={emailError ? "border-destructive" : ""}
                  />
                  {emailError && (
                    <p id="email-error" role="alert" className="text-xs text-destructive">
                      {emailError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    onBlur={() => setPasswordError(password ? null : "Введите пароль")}
                    required
                    disabled={loading}
                    aria-invalid={!!passwordError}
                    aria-describedby={passwordError ? "password-error" : undefined}
                    className={passwordError ? "border-destructive" : ""}
                  />
                  {passwordError && (
                    <p id="password-error" role="alert" className="text-xs text-destructive">
                      {passwordError}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Вход..." : "Войти"}
                </Button>
              </div>

              <OAuthButtons disabled={loading} />

              <p className="text-center text-xs text-muted-foreground">
                Нет аккаунта?{" "}
                <Link
                  href="/register"
                  className="rounded-sm font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Зарегистрироваться
                </Link>
              </p>
            </div>
          </form>

          <div className="relative hidden min-h-0 flex-col items-center overflow-hidden bg-muted p-8 md:flex">
            <KatanaLogo />

            <div className="mt-4 w-full space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Настоящий код с первого урока
                  </span>{" "}
                  — первый рабочий скрипт уже в начале курса
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Gauge className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Мгновенная проверка</span> —
                  решение запускается прямо в браузере
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">XP, уровни и достижения</span> —
                  прогресс виден сразу
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Database className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Хранение прогресса</span> —
                  регистрация нужна только для хранения вашего прогресса
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
