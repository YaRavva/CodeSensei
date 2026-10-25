"use client";

import { useEffect } from "react";
import Link from "next/link";
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
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-2xl font-bold">
          !
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Что-то пошло не так</h2>
        <p className="text-muted-foreground text-sm">
          Произошла непредвиденная ошибка при загрузке страницы. Попробуйте обновить данные или вернуться на главную.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button onClick={() => reset()} variant="default">
            Повторить попытку
          </Button>
          <Button asChild variant="outline">
            <Link href="/modules">К модулям</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
