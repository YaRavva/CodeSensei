import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Clock, Rocket, ArrowRight, ShieldCheck, Zap, Code } from "lucide-react";

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
              CS
            </span>
            <div>
              <h1 className="text-base font-bold tracking-tight">CodeSensei Design System</h1>
              <p className="text-xs text-muted-foreground">Strictly following landing-page-design & Tailwind scale</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/">На главную</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-12 space-y-16">
        {/* Intro */}
        <section className="space-y-4 max-w-2xl">
          <Badge variant="outline" className="text-primary border-primary/30">
            Design System Reference
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Единая визуальная система CodeSensei
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            Все компоненты построены на строгой типографике Geist, фиксированной шкале отступов Tailwind, правильных радиусах и без градиентов на фонах. Никаких переносов в бейджах и нарушений контраста.
          </p>
        </section>

        {/* 1. Typography & Scale */}
        <section className="space-y-6">
          <div className="border-b pb-3">
            <h3 className="text-xl font-semibold">1. Типографика (Type Scale)</h3>
            <p className="text-sm text-muted-foreground">Использование только утвержденной шкалы без промежуточных произвольных значений.</p>
          </div>

          <div className="grid gap-6 rounded-2xl border bg-card p-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="text-4xl font-bold tracking-tight">Заголовок 4XL (36px)</div>
              <div className="text-3xl font-bold tracking-tight">Заголовок 3XL (30px)</div>
              <div className="text-2xl font-semibold">Заголовок 2XL (24px)</div>
              <div className="text-xl font-semibold">Заголовок XL (20px)</div>
              <div className="text-lg font-medium">Крупный текст LG (18px)</div>
            </div>
            <div className="space-y-4">
              <div className="text-base">Основной текст BASE (16px) — стандартный размер для чтения.</div>
              <div className="text-sm text-muted-foreground">Вторичный текст SM (14px) для описаний и меток.</div>
              <div className="text-xs text-muted-foreground">Мелкий текст XS (12px) для бейджей и тегов.</div>
              <div className="font-mono text-xs bg-muted p-3 rounded-lg">
                // Geist Mono для кода и чисел: 100% XP / 4.8 сек
              </div>
            </div>
          </div>
        </section>

        {/* 2. Badges & Statuses */}
        <section className="space-y-6">
          <div className="border-b pb-3">
            <h3 className="text-xl font-semibold">2. Бейджи и статусы (Strictly Single Line)</h3>
            <p className="text-sm text-muted-foreground">Гарантированное отсутствие переносов (whitespace-nowrap shrink-0) и правильные отступы.</p>
          </div>

          <div className="flex flex-wrap gap-4 items-center rounded-2xl border bg-card p-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/40 whitespace-nowrap shrink-0">
              <Rocket className="size-3.5" />
              <span>В процессе</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/40 whitespace-nowrap shrink-0">
              <CheckCircle2 className="size-3.5" />
              <span>Завершен</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold bg-muted/40 text-muted-foreground border-border whitespace-nowrap shrink-0">
              <Clock className="size-3.5" />
              <span>Не начат</span>
            </div>
            <Badge variant="secondary">Level 5</Badge>
            <Badge variant="outline">Уровень 2</Badge>
          </div>
        </section>

        {/* 3. Buttons */}
        <section className="space-y-6">
          <div className="border-b pb-3">
            <h3 className="text-xl font-semibold">3. Кнопки (Buttons)</h3>
            <p className="text-sm text-muted-foreground">Стандартные размеры, анимации по кривой Безье и четкие состояния взаимодействия.</p>
          </div>

          <div className="flex flex-wrap gap-4 items-center rounded-2xl border bg-card p-6">
            <Button size="default">Основная кнопка</Button>
            <Button variant="secondary">Вторичная кнопка</Button>
            <Button variant="outline">Контурная кнопка</Button>
            <Button variant="ghost">Кнопка Ghost</Button>
            <Button variant="destructive">Удалить</Button>
          </div>
        </section>

        {/* 4. Cards & Modules */}
        <section className="space-y-6">
          <div className="border-b pb-3">
            <h3 className="text-xl font-semibold">4. Карточки модулей (Module Cards)</h3>
            <p className="text-sm text-muted-foreground">Пример готовой карточки с разделением статуса и текста без слияния.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card/70 p-6 shadow-sm hover:border-primary/40 transition-colors">
              <CardHeader className="relative space-y-4 pb-4 p-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 pr-2">
                    <CardTitle className="text-base font-semibold leading-tight sm:text-lg">
                      Вещественные числа и математика
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground/90">
                      Типы float, округление и библиотека math
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 text-right text-xs text-muted-foreground shrink-0">
                    <div className="inline-flex min-w-[110px] items-center justify-end gap-1.5 rounded-full bg-muted/40 px-2.5 py-1 text-xs whitespace-nowrap">
                      <span className="text-muted-foreground/85">Уровень</span>
                      <span className="font-semibold text-foreground">2</span>
                    </div>
                    <div className="inline-flex min-w-[110px] items-center justify-end gap-1.5 rounded-full bg-muted/20 px-2.5 py-1 text-xs whitespace-nowrap">
                      <span className="text-muted-foreground/85">Заданий</span>
                      <span className="font-medium text-foreground/90">8</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-3 border-t text-xs text-muted-foreground/90">
                  <span className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 border-primary/60 bg-primary/10 text-primary">
                    <Rocket className="size-3.5 shrink-0" />
                    <span>В процессе</span>
                  </span>
                  <span className="truncate text-right font-medium text-muted-foreground/80 pl-2">
                    Продолжайте — до завершения осталось немного.
                  </span>
                </div>
              </CardHeader>
              <CardContent className="relative flex flex-1 flex-col space-y-4 pt-4 p-0">
                <div className="line-clamp-3 text-xs text-muted-foreground/90 sm:text-sm">
                  Изучите работу с числами с плавающей точкой, погрешности вычислений и встроенные математические функции Python.
                </div>
                <div className="mt-auto pt-2">
                  <Button className="w-full">Продолжить</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card/70 p-6 shadow-sm hover:border-primary/40 transition-colors">
              <CardHeader className="relative space-y-4 pb-4 p-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 pr-2">
                    <CardTitle className="text-base font-semibold leading-tight sm:text-lg">
                      Основы Python и синтаксис
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground/90">
                      Переменные, ввод и вывод данных
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 text-right text-xs text-muted-foreground shrink-0">
                    <div className="inline-flex min-w-[110px] items-center justify-end gap-1.5 rounded-full bg-muted/40 px-2.5 py-1 text-xs whitespace-nowrap">
                      <span className="text-muted-foreground/85">Уровень</span>
                      <span className="font-semibold text-foreground">1</span>
                    </div>
                    <div className="inline-flex min-w-[110px] items-center justify-end gap-1.5 rounded-full bg-muted/20 px-2.5 py-1 text-xs whitespace-nowrap">
                      <span className="text-muted-foreground/85">Заданий</span>
                      <span className="font-medium text-foreground/90">10</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-3 border-t text-xs text-muted-foreground/90">
                  <span className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 border-emerald-500/60 bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="size-3.5 shrink-0" />
                    <span>Завершен</span>
                  </span>
                  <span className="truncate text-right font-medium text-muted-foreground/80 pl-2">
                    Модуль успешно завершён.
                  </span>
                </div>
              </CardHeader>
              <CardContent className="relative flex flex-1 flex-col space-y-4 pt-4 p-0">
                <div className="line-clamp-3 text-xs text-muted-foreground/90 sm:text-sm">
                  Первый шаг в программировании: пишем первые скрипты, изучаем типы данных и базовые конструкции.
                </div>
                <div className="mt-auto pt-2">
                  <Button variant="outline" className="w-full">Повторить</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 5. Form Inputs */}
        <section className="space-y-6">
          <div className="border-b pb-3">
            <h3 className="text-xl font-semibold">5. Формы и поля ввода (Inputs & Labels)</h3>
            <p className="text-sm text-muted-foreground">Доступность, фокусы и валидация.</p>
          </div>

          <div className="grid gap-6 rounded-2xl border bg-card p-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Электронная почта</Label>
              <Input id="email" type="email" placeholder="student@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" type="password" placeholder="••••••••" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
