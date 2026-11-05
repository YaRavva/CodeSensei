"use client";

import { CheckCircle2, Clock, Database, Gauge } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KatanaLogo } from "@/components/brand-logo";
import { useAuth } from "@/components/auth/auth-provider";
import { OAuthButtons } from "@/components/oauth-buttons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getNameValidationError, isValidRussianName } from "@/lib/utils/name-validation";
import { validateEmail, validatePassword } from "@/lib/utils/validation";

interface ErrorResponse {
  error?: string;
}

const linkClass =
  "text-primary font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const { toast } = useToast();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    const trimmedName = displayName.trim();
    const nextNameError =
      trimmedName && !isValidRussianName(trimmedName) ? getNameValidationError(trimmedName) : null;

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setNameError(nextNameError);

    if (nextEmailError || nextPasswordError || nextNameError) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, displayName: trimmedName }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as ErrorResponse | null;
        toast({
          title: "Ошибка регистрации",
          description: data?.error || "Не удалось создать аккаунт",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Аккаунт создан",
        description: "Прогресс будет сохраняться автоматически",
      });

      await refreshProfile();
      router.push("/modules");
      router.refresh();
    } catch (error) {
      console.error("Unexpected registration error", error);
      toast({
        title: "Неожиданная ошибка",
        description: "Не удалось создать аккаунт. Попробуйте ещё раз через минуту",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-background flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <form className="p-6" onSubmit={handleRegister} noValidate>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">Создать аккаунт</h1>
                    <p className="text-sm text-muted-foreground">
                      Регистрация нужна только для хранения вашего прогресса
                    </p>
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
                        onBlur={() => setPasswordError(validatePassword(password))}
                        required
                        minLength={8}
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

                    <div className="space-y-2">
                      <Label htmlFor="displayName">Полное имя (необязательно)</Label>
                      <Input
                        id="displayName"
                        type="text"
                        placeholder="Иван Петров или John Doe"
                        value={displayName}
                        onChange={(e) => {
                          setDisplayName(e.target.value);
                          if (nameError) {
                            setNameError(null);
                          }
                        }}
                        onBlur={() => {
                          const trimmed = displayName.trim();
                          if (trimmed && !isValidRussianName(trimmed)) {
                            setNameError(getNameValidationError(trimmed));
                          } else {
                            setNameError(null);
                          }
                        }}
                        disabled={loading}
                        className={nameError ? "border-destructive" : ""}
                        aria-invalid={!!nameError}
                        aria-describedby={nameError ? "name-error" : undefined}
                      />
                      {nameError && (
                        <p id="name-error" role="alert" className="text-xs text-destructive">
                          {nameError}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Укажите минимум 2 слова (например: Иван Петров)
                      </p>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Регистрация..." : "Зарегистрироваться"}
                    </Button>
                  </div>

                  <OAuthButtons disabled={loading} />

                  <p className="text-center text-xs text-muted-foreground">
                    Уже есть аккаунт?{" "}
                    <Link href="/login" className={linkClass}>
                      Войти
                    </Link>
                  </p>
                </div>
              </form>

              <div className="relative hidden min-h-0 flex-col items-center overflow-hidden bg-muted p-8 md:flex">
                <KatanaLogo />

                <div className="mt-4 w-full space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      className="mt-0.5 size-5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
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
                      <span className="font-semibold text-foreground">XP, уровни и достижения</span>{" "}
                      — прогресс виден сразу
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
      </div>
    </div>
  );
}
