"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { validateEmail } from "@/lib/utils/validation";

interface ResetResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

const linkClass =
  "text-center text-sm text-muted-foreground underline-offset-2 hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();

    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    if (nextEmailError) return;

    setLoading(true);

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json().catch(() => null)) as ResetResponse | null;

      if (!response.ok) {
        toast({
          title: "Письмо не отправлено",
          description: data?.error || "Не удалось отправить письмо",
          variant: "destructive",
        });
        return;
      }

      const serverMessage =
        data?.message || "Если такая почта зарегистрирована, письмо со ссылкой отправлено.";

      setMessage(serverMessage);
      setSent(true);
      toast({
        title: "Письмо отправлено",
        description: serverMessage,
      });
    } catch (error) {
      console.error("Unexpected password reset error", error);
      toast({
        title: "Неожиданная ошибка",
        description: "Не удалось отправить письмо. Попробуйте ещё раз через минуту",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="container mx-auto flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-semibold tracking-tight">Письмо отправлено</h1>
            <CardDescription>
              {message || "Если такая почта зарегистрирована, письмо со ссылкой отправлено."}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Вернуться к входу</Link>
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
          <h1 className="text-2xl font-semibold tracking-tight">Восстановление пароля</h1>
          <CardDescription>Введите почту, и мы пришлём ссылку для нового пароля</CardDescription>
        </CardHeader>
        <form onSubmit={handleReset} noValidate>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Отправка..." : "Отправить"}
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
