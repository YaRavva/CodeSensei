"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-2xl font-bold text-destructive">
          !
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Что-то пошло не так</h1>
        <p className="text-sm text-muted-foreground">
          Страница не загрузилась. Попробуйте повторить запрос, а если ошибка останется, вернитесь
          на главную.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button onClick={() => reset()}>Повторить попытку</Button>
          <Button asChild variant="outline">
            <Link href="/modules">К модулям</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
