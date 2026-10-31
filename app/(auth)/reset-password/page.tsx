"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { validatePassword, validatePasswordRepeat } from "@/lib/utils/validation";

interface ConfirmResetResponse {
  success?: boolean;
  error?: string;
}

const linkClass =
  "text-center text-sm text-muted-foreground underline-offset-2 hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const secret = searchParams.get("secret");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();

    const nextPasswordError = validatePassword(password);
    const nextConfirmError = validatePasswordRepeat(password, confirmPassword);

    setPasswordError(nextPasswordError);
    setConfirmError(nextConfirmError);

    if (nextPasswordError || nextConfirmError) {
      return;
    }

    if (!userId || !secret) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, secret, password }),
      });

      const data = (await response.json().catch(() => null)) as ConfirmResetResponse | null;

      if (!response.ok) {
        toast({
          title: "Пароль не обновлён",
          description: data?.error || "Ссылка могла устареть. Запросите новую",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Пароль обновлён",
        description: "Теперь можно войти с новым паролем",
      });

      router.push("/login");
    } catch (error) {
      console.error("Unexpected password update error", error);
      toast({
        title: "Неожиданная ошибка",
        description: "Не удалось обновить пароль. Попробуйте ещё раз через минуту",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!userId || !secret) {
    return (
      <div className="container mx-auto flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-semibold tracking-tight">Ссылка недействительна</h1>
            <CardDescription>
              Ссылка для восстановления пароля устарела. Запросите новую, и мы пришлём её на почту.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/forgot-password">Запросить новую ссылку</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-semibold tracking-tight">Новый пароль</h1>
          <CardDescription>Придумайте пароль не короче 8 символов</CardDescription>
        </CardHeader>
        <form onSubmit={handleReset} noValidate>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Новый пароль</Label>
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
              <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmError) setConfirmError(null);
                }}
                onBlur={() => setConfirmError(validatePasswordRepeat(password, confirmPassword))}
                required
                minLength={8}
                disabled={loading}
                aria-invalid={!!confirmError}
                aria-describedby={confirmError ? "confirm-error" : undefined}
                className={confirmError ? "border-destructive" : ""}
              />
              {confirmError && (
                <p id="confirm-error" role="alert" className="text-xs text-destructive">
                  {confirmError}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Сохранение..." : "Сохранить пароль"}
            </Button>
            <Link href="/login" className={linkClass}>
              Вернуться к входу
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="h-7 w-40 rounded-md bg-muted motion-safe:animate-pulse" />
              <div className="mt-2 h-4 w-full max-w-xs rounded-md bg-muted motion-safe:animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-10 w-full rounded-md bg-muted motion-safe:animate-pulse" />
              <div className="h-10 w-full rounded-md bg-muted motion-safe:animate-pulse" />
            </CardContent>
            <CardFooter>
              <div className="h-10 w-full rounded-md bg-muted motion-safe:animate-pulse" />
            </CardFooter>
          </Card>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
