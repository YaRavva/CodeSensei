"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getNameValidationError, isValidRussianName } from "@/lib/utils/name-validation";

interface ErrorResponse {
  error?: string;
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = displayName.trim();
    if (trimmedName && !isValidRussianName(trimmedName)) {
      const errorMessage = getNameValidationError(trimmedName);
      setNameError(errorMessage);
      toast({
        title: "Ошибка валидации",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    setNameError(null);
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
          description: data?.error || "Не удалось зарегистрироваться",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Регистрация успешна",
        description: "Добро пожаловать в CodeSensei!",
      });

      router.push("/modules");
      router.refresh();
    } catch (error) {
      console.error("Unexpected registration error", error);
      toast({
        title: "Неожиданная ошибка",
        description: "Не удалось зарегистрироваться. Попробуйте снова чуть позже",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-background flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <form className="p-6 md:p-8" onSubmit={handleRegister}>
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">Создать аккаунт</h1>
                    <p className="text-muted-foreground text-balance">
                      Зарегистрируйтесь в CodeSensei
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
                        minLength={8}
                        disabled={loading}
                      />
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
                        <p id="name-error" className="text-sm text-destructive">
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

                  <p className="text-center text-sm text-muted-foreground">
                    Уже есть аккаунт?{" "}
                    <Link href="/login" className="text-primary hover:underline font-medium">
                      Войти
                    </Link>
                  </p>
                </div>
              </form>

              <div className="bg-muted relative hidden md:block overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    style={{
                      transform: "scale(2)",
                      transformOrigin: "center",
                      maskImage: "url(/CodeSensei.svg)",
                      maskSize: "contain",
                      maskRepeat: "no-repeat",
                      maskPosition: "center",
                      WebkitMaskImage: "url(/CodeSensei.svg)",
                      WebkitMaskSize: "contain",
                      WebkitMaskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      backgroundColor: "var(--primary)",
                      width: "320px",
                      height: "320px",
                      minWidth: "320px",
                      minHeight: "320px",
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
