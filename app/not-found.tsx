import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl border bg-card">
        <span className="font-ubuntu-mono text-lg font-semibold text-primary">404</span>
      </div>
      <h1 className="text-balance text-4xl font-bold md:text-5xl">Такой страницы нет</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Но у нас есть много других! Попробуйте начать с одной из этих:
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Button asChild size="lg" className="h-11 px-6 text-base font-semibold">
          <Link href="/modules">
            <Home className="size-5" />К модулям
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg" className="h-11 px-6 text-base font-medium">
          <Link href="/">
            <ArrowLeft className="size-5" />
            На главную
          </Link>
        </Button>
      </div>
    </div>
  );
}
