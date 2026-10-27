import { ArrowRight, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const codeLines = [
  { indent: 0, text: "def greet(name):" },
  { indent: 4, text: '    return f"Hello, {name}"' },
  { indent: 0, text: "" },
  { indent: 0, text: 'print(greet("Python"))' },
];

export function LandingHero() {
  return (
    <section className="container mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
      <div className="landing-rise space-y-6">
        <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-secondary/40 px-3 py-1 text-sm font-medium text-secondary-foreground">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Тренажёр для школьников 7–9 классов
        </div>
        <h1 className="hero-heading-gradient max-w-[680px] text-balance text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
          Пиши настоящий код с первого урока
        </h1>
        <p className="max-w-[680px] text-lg text-muted-foreground">
          Интерактивные модули по Python с понятными задачами, мгновенной проверкой и XP за каждое
          решение. Сложность растёт вместе с вами.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button asChild size="lg" className="h-11 px-6 text-base font-semibold">
            <Link href="/register">
              Начать бесплатно
              <ArrowRight className="size-5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="h-11 px-6 text-base font-medium">
            <Link href="/login">Войти</Link>
          </Button>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <BadgeCheck className="size-4 text-primary" /> Абсолютно бесплатно — без карты и скрытых
          платежей
        </p>
      </div>

      {/* Продуктовая иллюстрация: редактор с кодом, как в реальном приложении */}
      <div className="landing-rise [animation-delay:150ms]">
        <div className="relative overflow-hidden rounded-2xl border bg-card shadow-[0_24px_64px_-24px_rgba(15,23,42,0.45)]">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <span className="h-3 w-3 rounded-full bg-destructive/70" />
                <span className="h-3 w-3 rounded-full bg-primary/50" />
                <span className="h-3 w-3 rounded-full bg-muted-foreground/50" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">module_01.py</span>
            </div>
            <div className="hidden items-center gap-2 rounded-lg bg-secondary/60 px-3 py-1 text-sm font-semibold text-primary sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-primary" />
              XP за решение
            </div>
          </div>
          <div className="space-y-3 bg-card p-8 font-ubuntu-mono text-base leading-relaxed">
            {codeLines.map((line, i) => (
              <div key={i} className="flex" style={{ paddingLeft: line.indent > 0 ? "2rem" : "0" }}>
                <span className="mr-4 select-none text-muted-foreground/40">{i + 1}</span>
                <span className="text-foreground/90">{line.text}</span>
              </div>
            ))}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                <span className="mb-1 block text-muted-foreground">Тест</span>
                <span className="font-medium text-foreground">greet("Python") — прошёл</span>
              </div>
              <div className="rounded-lg border bg-emerald-500/5 px-4 py-3 text-sm">
                <span className="mb-1 block text-muted-foreground">Результат</span>
                <span className="font-medium text-foreground">Hello, Python!</span>
              </div>
            </div>
            <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
              Отлично! Ты разобрался с функциями. 40 XP — следующий уровень через 12 XP.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
