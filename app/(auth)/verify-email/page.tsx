"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface VerifyResponse {
  success?: boolean;
  error?: string;
}

const linkClass =
  "text-center text-sm text-muted-foreground underline-offset-2 hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const secret = searchParams.get("secret");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const { toast } = useToast();

  async function handleVerify() {
    if (!userId || !secret) return;
    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, secret }),
      });

      const data = (await response.json().catch(() => null)) as VerifyResponse | null;

      if (!response.ok || !data?.success) {
        toast({
          title: "Не удалось подтвердить email",
          description:
            data?.error ||
            "Ссылка недействительна или устарела. Запросите новое письмо на странице входа.",
          variant: "destructive",
        });
        return;
      }

      setConfirmed(true);
      toast({
        title: "Email подтверждён",
        description: "Теперь можно войти в аккаунт",
      });
    } catch (error) {
      console.error("Unexpected verification error", error);
      toast({
        title: "Неожиданная ошибка",
        description: "Не удалось подтвердить email. Попробуйте ещё раз через минуту",
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
              В ссылке нет данных для подтверждения. Запросите новое письмо на странице входа.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Перейти ко входу</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="container mx-auto flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <h1 className="text-2xl font-semibold tracking-tight">Email подтверждён</h1>
            <CardDescription>
              Спасибо! Теперь войдите с вашей почтой и паролем, чтобы начать обучение.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/login">Войти в аккаунт</Link>
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
          <h1 className="text-2xl font-semibold tracking-tight">Подтверждение email</h1>
          <CardDescription>
            Нажмите кнопку, чтобы подтвердить почту и активировать аккаунт
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleVerify} className="w-full" disabled={loading}>
            {loading ? "Подтверждение..." : "Подтвердить email"}
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Link href="/login" className={linkClass}>
            Вернуться к входу
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="h-7 w-48 rounded-md bg-muted motion-safe:animate-pulse" />
              <div className="mt-2 h-4 w-full max-w-xs rounded-md bg-muted motion-safe:animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-10 w-full rounded-md bg-muted motion-safe:animate-pulse" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
