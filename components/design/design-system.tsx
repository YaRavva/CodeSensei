"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  CheckCircle,
  Clock,
  Code,
  Copy,
  CursorClick,
  Fire,
  Flag,
  Info,
  Lightbulb,
  Lightning,
  Lock,
  MagnifyingGlass,
  Medal,
  Palette,
  Play,
  Rocket,
  Ruler,
  Sparkle,
  Star,
  Target,
  Terminal,
  Textbox,
  TextAa,
  Trophy,
  Warning,
} from "@phosphor-icons/react";
import Link from "next/link";
import { type ComponentType, type ReactNode, useEffect, useRef, useState } from "react";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { ModuleCard } from "@/components/modules/module-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Module } from "@/types/db";

type IconType = ComponentType<{ className?: string; weight?: "regular" | "bold" | "fill" | "duotone" }>;

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

const SECTIONS = [
  { id: "principles", label: "Принципы" },
  { id: "colors", label: "Цвета" },
  { id: "typography", label: "Типографика" },
  { id: "spacing", label: "Отступы" },
  { id: "radius", label: "Радиусы" },
  { id: "icons", label: "Иконки" },
  { id: "motion", label: "Движение" },
  { id: "components", label: "Компоненты" },
  { id: "feedback", label: "Состояния" },
  { id: "product", label: "Продукт" },
] as const;

/* ───────────────────────── Навигация ───────────────────────── */

function useActiveSection(): string {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);
  return active;
}

function SectionNav() {
  const active = useActiveSection();
  return (
    <nav
      aria-label="Разделы дизайн-системы"
      className="sticky top-20 z-40 mx-auto w-fit max-w-full rounded-2xl border bg-background/70 p-1 shadow-sm backdrop-blur-xl"
    >
      <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={active === s.id ? "true" : undefined}
            className={cn(
              "title-4 shrink-0 rounded-xl px-3 py-1 whitespace-nowrap transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              EASE,
              active === s.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

/* ───────────────────────── Общие блоки ───────────────────────── */

function Section({
  id,
  index,
  title,
  description,
  children,
}: {
  id: string;
  index: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-40">
      <ScrollReveal>
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[680px] space-y-2">
            <span className="caption-3 font-mono text-primary">{String(index).padStart(2, "0")}</span>
            <h2 className="heading-4 tracking-tight">{title}</h2>
            <p className="body-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </ScrollReveal>
    </section>
  );
}

function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("min-w-0 rounded-2xl border bg-card p-6", className)}>{children}</div>;
}

function PanelLabel({ children }: { children: ReactNode }) {
  return <p className="caption-3 mb-4 uppercase tracking-wider text-muted-foreground">{children}</p>;
}

function CopyChip({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className={cn(
        "caption-5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-muted-foreground transition-colors duration-300 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        EASE
      )}
      aria-label={`Скопировать ${value}`}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {value}
    </button>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

const HERO_STATS = [
  { value: "26", label: "текстовых стилей" },
  { value: "13", label: "шагов отступа" },
  { value: "22", label: "цветовых токена" },
  { value: "1", label: "гарнитура" },
];

function Hero() {
  return (
    <header className="pt-16 pb-8 md:pt-24">
      <div className="landing-rise space-y-6">
        <span className="caption-1 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-muted-foreground">
          <Sparkle className="size-4 text-primary" weight="fill" />
          Дизайн-система CodeSensei
        </span>
        <h1 className="heading-2 md:heading-1 hero-heading-gradient max-w-[680px] tracking-tight">
          Один язык
          <br />
          для всего интерфейса
        </h1>
        <p className="body-3 max-w-[680px] text-muted-foreground md:title-1 md:font-normal">
          Токены, текстовые стили, компоненты и правила движения, из которых собраны каталог
          модулей, редактор кода и профиль ученика. Каждое значение ниже взято из живых стилей
          проекта.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <a href="#colors">
              Смотреть токены
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">На главную</Link>
          </Button>
        </div>
      </div>
      <dl className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
        {HERO_STATS.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4">
            <dt className="caption-2 text-muted-foreground">{s.label}</dt>
            <dd className="heading-4 font-mono tracking-tight">{s.value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

/* ───────────────────────── Принципы ───────────────────────── */

const PRINCIPLES: { icon: IconType; title: string; text: string }[] = [
  {
    icon: TextAa,
    title: "Одна гарнитура",
    text: "Manrope для всего текста, Geist Mono только для кода и чисел. Без курсива и сверхжирных начертаний.",
  },
  {
    icon: Palette,
    title: "Плоские поверхности",
    text: "Фоны без градиентов. Глубину задают слои поверхностей и рамки по всему периметру.",
  },
  {
    icon: Ruler,
    title: "Шкала без исключений",
    text: "Размеры шрифта, отступы и радиусы берутся только из таблиц. Произвольных значений нет.",
  },
  {
    icon: Lightning,
    title: "Движение с весом",
    text: "Одна кривая замедления для всех переходов. Анимируются только transform и opacity.",
  },
];

function Principles() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PRINCIPLES.map(({ icon: Icon, title, text }) => (
        <div
          key={title}
          className={cn(
            "group rounded-2xl border bg-card p-6 transition-transform duration-500 hover:-translate-y-1",
            EASE
          )}
        >
          <span className="mb-6 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" weight="bold" />
          </span>
          <h3 className="title-2 mb-2">{title}</h3>
          <p className="body-6 text-muted-foreground">{text}</p>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── Цвета ───────────────────────── */

const COLOR_GROUPS: { title: string; tokens: { name: string; fg?: string; note: string }[] }[] = [
  {
    title: "Бренд и статусы",
    tokens: [
      { name: "primary", fg: "primary-foreground", note: "Основное действие, акценты" },
      { name: "success", fg: "success-foreground", note: "Решено, пройдено" },
      { name: "destructive", fg: "destructive-foreground", note: "Ошибки, удаление" },
      { name: "ring", note: "Кольцо фокуса" },
    ],
  },
  {
    title: "Поверхности",
    tokens: [
      { name: "background", fg: "foreground", note: "Фон страницы" },
      { name: "card", fg: "card-foreground", note: "Карточки и панели" },
      { name: "muted", fg: "muted-foreground", note: "Приглушённые зоны" },
      { name: "secondary", fg: "secondary-foreground", note: "Вторичные кнопки" },
    ],
  },
  {
    title: "Текст и линии",
    tokens: [
      { name: "foreground", note: "Основной текст" },
      { name: "muted-foreground", note: "Подписи, описания" },
      { name: "border", note: "Рамки карточек" },
      { name: "input", note: "Рамки полей" },
    ],
  },
];

const CHARTS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
const DARK_SURFACES = ["#000000", "#131209", "#181818", "#1F1F1F", "#272727", "#313131"];

function toHex(color: string): string {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return color;
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  return a < 255 ? `${hex} · ${Math.round((a / 255) * 100)}%` : hex;
}

function useCssVar(name: string): string {
  const [value, setValue] = useState("");
  useEffect(() => {
    const read = () =>
      setValue(toHex(getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()));
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, [name]);
  return value;
}

function Swatch({ name, fg, note }: { name: string; fg?: string; note: string }) {
  const value = useCssVar(name);
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div
        className="flex h-24 items-end p-3"
        style={{ background: `var(--${name})`, color: fg ? `var(--${fg})` : undefined }}
      >
        {fg ? <span className="title-3">Aa</span> : null}
      </div>
      <div className="space-y-1 p-3">
        <p className="title-4 font-mono">--{name}</p>
        <p className="caption-5 text-muted-foreground">{note}</p>
        {value ? <CopyChip value={value} /> : <span className="block h-5" />}
      </div>
    </div>
  );
}

function Colors() {
  return (
    <div className="space-y-8">
      {COLOR_GROUPS.map((group) => (
        <div key={group.title}>
          <PanelLabel>{group.title}</PanelLabel>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {group.tokens.map((t) => (
              <Swatch key={t.name} {...t} />
            ))}
          </div>
        </div>
      ))}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelLabel>Графики</PanelLabel>
          <div className="flex h-16 overflow-hidden rounded-xl">
            {CHARTS.map((c) => (
              <div key={c} className="flex-1" style={{ background: `var(--${c})` }} title={`--${c}`} />
            ))}
          </div>
          <div className="mt-3 flex justify-between">
            {CHARTS.map((c) => (
              <span key={c} className="caption-5 font-mono text-muted-foreground">
                {c}
              </span>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelLabel>Тёмные поверхности</PanelLabel>
          <div className="grid grid-cols-6 gap-2">
            {DARK_SURFACES.map((hex) => (
              <div key={hex} className="space-y-2">
                <div className="h-16 rounded-xl border border-white/10" style={{ background: hex }} />
                <p className="caption-5 truncate text-center font-mono text-muted-foreground">{hex}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ───────────────────────── Типографика ───────────────────────── */

type TextStyle = { name: string; cls: string; spec: string; sample: string };

const TYPE_GROUPS: { id: string; label: string; styles: TextStyle[] }[] = [
  {
    id: "heading",
    label: "Heading",
    styles: [
      { name: "Heading 1", cls: "heading-1", spec: "60 / 60 · Semibold", sample: "Решай задачи" },
      { name: "Heading 2", cls: "heading-2", spec: "48 / 48 · Semibold", sample: "Уровень пройден" },
      { name: "Heading 3", cls: "heading-3", spec: "36 / 40 · Semibold", sample: "Циклы и условия" },
      { name: "Heading 4", cls: "heading-4", spec: "30 / 36 · Semibold", sample: "Словари и множества" },
      { name: "Heading 5", cls: "heading-5", spec: "24 / 32 · Semibold", sample: "Рекурсия в Python" },
      { name: "Heading 6", cls: "heading-6", spec: "20 / 28 · Semibold", sample: "Задание 3 из 6" },
    ],
  },
  {
    id: "title",
    label: "Title",
    styles: [
      { name: "Title 1", cls: "title-1", spec: "20 / 28 · Medium", sample: "Списки и их методы" },
      { name: "Title 2", cls: "title-2", spec: "18 / 28 · Medium", sample: "Карточка модуля" },
      { name: "Title 3", cls: "title-3", spec: "16 / 24 · Medium", sample: "Пункт списка" },
      { name: "Title 4", cls: "title-4", spec: "14 / 20 · Medium", sample: "Пункт навигации" },
      { name: "Title 5", cls: "title-5", spec: "12 / 16 · Medium", sample: "Метка блока" },
    ],
  },
  {
    id: "body",
    label: "Body",
    styles: [
      { name: "Body 1", cls: "body-1", spec: "16 / 24 · Semibold", sample: "Функция возвращает сумму чисел." },
      { name: "Body 2", cls: "body-2", spec: "16 / 24 · Medium", sample: "Функция возвращает сумму чисел." },
      { name: "Body 3", cls: "body-3", spec: "16 / 24 · Regular", sample: "Функция возвращает сумму чисел." },
      { name: "Body 4", cls: "body-4", spec: "14 / 20 · Semibold", sample: "Цикл повторяется, пока условие истинно." },
      { name: "Body 5", cls: "body-5", spec: "14 / 20 · Medium", sample: "Цикл повторяется, пока условие истинно." },
      { name: "Body 6", cls: "body-6", spec: "14 / 20 · Regular", sample: "Цикл повторяется, пока условие истинно." },
    ],
  },
  {
    id: "button",
    label: "Button",
    styles: [
      { name: "Button lg", cls: "button-lg", spec: "18 / 28 · Semibold", sample: "Начать обучение" },
      { name: "Button md", cls: "button-md", spec: "16 / 24 · Semibold", sample: "Запустить код" },
      { name: "Button sm", cls: "button-sm", spec: "14 / 20 · Semibold", sample: "Подсказка" },
      { name: "Button Xsm", cls: "button-xsm", spec: "12 / 16 · Semibold", sample: "Сбросить" },
    ],
  },
  {
    id: "caption",
    label: "Caption",
    styles: [
      { name: "Caption 1", cls: "caption-1", spec: "14 / 20 · Medium", sample: "Обновлено 12 октября" },
      { name: "Caption 2", cls: "caption-2", spec: "14 / 20 · Regular", sample: "Минимум 8 символов" },
      { name: "Caption 3", cls: "caption-3", spec: "12 / 16 · Semibold", sample: "+20 XP" },
      { name: "Caption 4", cls: "caption-4", spec: "12 / 16 · Medium", sample: "6 заданий" },
      { name: "Caption 5", cls: "caption-5", spec: "12 / 16 · Regular", sample: "4.8 сек" },
    ],
  },
];

function Typography() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelLabel>Основная гарнитура</PanelLabel>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="heading-1 leading-none tracking-tight">Aa</p>
              <p className="title-1 mt-4">Manrope</p>
              <p className="caption-2 text-muted-foreground">Regular 400 · Medium 500 · Semibold 600 · Bold 700</p>
            </div>
            <p className="body-3 max-w-xs text-muted-foreground">
              АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ
              <br />
              абвгдеёжзийклмнопрстуфхцчшщэюя
              <br />
              0123456789 ?!.,:;()«»
            </p>
          </div>
        </Panel>
        <Panel>
          <PanelLabel>Код и числа</PanelLabel>
          <p className="heading-3 font-mono tracking-tight">{"{ }"}</p>
          <p className="title-1 mt-4">Geist Mono</p>
          <p className="caption-2 text-muted-foreground">Редактор, результаты тестов, XP</p>
          <pre className="caption-5 mt-4 overflow-x-auto rounded-xl border bg-background p-3 font-mono">
            {"for i in range(3):\n    print(i * 2)"}
          </pre>
        </Panel>
      </div>
      <Panel className="p-0">
        <Tabs defaultValue="heading">
          <div className="border-b p-3">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
              {TYPE_GROUPS.map((g) => (
                <TabsTrigger key={g.id} value={g.id} className="rounded-lg data-[state=active]:bg-muted">
                  {g.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {TYPE_GROUPS.map((g) => (
            <TabsContent key={g.id} value={g.id} className="m-0">
              <ul className="divide-y">
                {g.styles.map((s) => (
                  <li key={s.cls} className="grid items-center gap-2 px-6 py-4 md:grid-cols-[200px_1fr]">
                    <div className="space-y-1">
                      <p className="title-4">{s.name}</p>
                      <p className="caption-5 font-mono text-muted-foreground">
                        .{s.cls} · {s.spec}
                      </p>
                    </div>
                    <p className={cn(s.cls, "min-w-0 truncate tracking-tight")}>{s.sample}</p>
                  </li>
                ))}
              </ul>
            </TabsContent>
          ))}
        </Tabs>
      </Panel>
    </div>
  );
}

/* ───────────────────────── Отступы ───────────────────────── */

const SPACING = [
  ["0", 0],
  ["25", 2],
  ["50", 4],
  ["75", 8],
  ["100", 12],
  ["200", 16],
  ["300", 24],
  ["400", 32],
  ["500", 40],
  ["600", 48],
  ["700", 64],
  ["800", 80],
  ["900", 96],
] as const;

function Spacing() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel className="lg:col-span-2">
        <PanelLabel>Шкала отступов</PanelLabel>
        <ul className="space-y-2">
          {SPACING.map(([token, px]) => (
            <li key={token} className="grid grid-cols-[88px_40px_1fr] items-center gap-3">
              <span className="caption-4 font-mono">spacing-{token}</span>
              <span className="caption-5 font-mono text-muted-foreground">{px}px</span>
              <span className="block h-3 rounded-sm bg-primary/80" style={{ width: px === 0 ? 1 : `${(px / 96) * 100}%` }} />
            </li>
          ))}
        </ul>
      </Panel>
      <Panel>
        <PanelLabel>Кнопка изнутри</PanelLabel>
        <div className="flex h-40 items-center justify-center rounded-xl border bg-background">
          <div className="relative">
            <span className="absolute -inset-y-2 -inset-x-3 rounded-md border border-dashed border-primary/60" />
            <Button>Запустить</Button>
          </div>
        </div>
        <p className="caption-2 mt-4 text-muted-foreground">
          Основная кнопка: 8px по вертикали и 12px по горизонтали. Между иконкой и текстом 8px.
        </p>
      </Panel>
    </div>
  );
}

/* ───────────────────────── Радиусы ───────────────────────── */

const RADII = [
  ["rounded-sm", "4px"],
  ["rounded-md", "6px"],
  ["rounded-lg", "8px"],
  ["rounded-xl", "12px"],
  ["rounded-2xl", "16px"],
  ["rounded-3xl", "24px"],
  ["rounded-full", "9999px"],
] as const;

function Radius() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel className="lg:col-span-2">
        <PanelLabel>Значения Tailwind</PanelLabel>
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-7">
          {RADII.map(([cls, px]) => (
            <div key={cls} className="space-y-2 text-center">
              <div className={cn("mx-auto size-16 border-2 border-primary/70 bg-primary/10", cls)} />
              <p className="caption-4 font-mono">{cls.replace("rounded-", "")}</p>
              <p className="caption-5 font-mono text-muted-foreground">{px}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <PanelLabel>Вложенный радиус</PanelLabel>
        <div className="rounded-2xl border-2 border-primary/60 p-2">
          <div className="flex h-24 items-center justify-center rounded-lg bg-primary/15">
            <span className="caption-3 font-mono text-primary">16 − 8 = 8px</span>
          </div>
        </div>
        <p className="caption-2 mt-4 text-muted-foreground">
          Внутренний радиус равен внешнему минус зазор, если зазор меньше 32px.
        </p>
      </Panel>
    </div>
  );
}

/* ───────────────────────── Иконки ───────────────────────── */

const ICONS: [IconType, string][] = [
  [Play, "Play"],
  [Code, "Code"],
  [Terminal, "Terminal"],
  [Lightbulb, "Lightbulb"],
  [BookOpen, "BookOpen"],
  [Target, "Target"],
  [Trophy, "Trophy"],
  [Medal, "Medal"],
  [Fire, "Fire"],
  [Star, "Star"],
  [Rocket, "Rocket"],
  [Flag, "Flag"],
  [CheckCircle, "CheckCircle"],
  [Clock, "Clock"],
  [Lock, "Lock"],
  [MagnifyingGlass, "MagnifyingGlass"],
];

function Icons() {
  const [weight, setWeight] = useState<"regular" | "bold" | "fill" | "duotone">("regular");
  return (
    <Panel>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="body-6 max-w-md text-muted-foreground">
          Phosphor Icons, размер 16 или 20px, цвет наследуется от текста. Material Icons не
          используются.
        </p>
        <div className="flex gap-1 rounded-xl border p-1">
          {(["regular", "bold", "fill", "duotone"] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeight(w)}
              aria-pressed={weight === w}
              className={cn(
                "caption-4 rounded-lg px-3 py-1 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                EASE,
                weight === w ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {ICONS.map(([Icon, name]) => (
          <div
            key={name}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl p-3 text-foreground transition-colors duration-300 hover:bg-muted",
              EASE
            )}
          >
            <Icon className="size-6" weight={weight} />
            <span className="caption-5 w-full truncate text-center text-muted-foreground">{name}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ───────────────────────── Движение ───────────────────────── */

function Motion() {
  const [moved, setMoved] = useState(false);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel className="lg:col-span-2">
        <div className="mb-6 flex items-center justify-between gap-3">
          <PanelLabel>Сравнение кривых</PanelLabel>
          <Button size="sm" variant="outline" onClick={() => setMoved((m) => !m)}>
            <Play className="size-4" weight="fill" />
            {moved ? "Вернуть" : "Запустить"}
          </Button>
        </div>
        <div className="space-y-4">
          {[
            { label: "Базовая кривая (0.22, 1, 0.36, 1)", cls: EASE, good: true },
            { label: "linear, не используется", cls: "ease-linear", good: false },
          ].map((row) => (
            <div key={row.label} className="space-y-2">
              <p className={cn("caption-4", row.good ? "text-foreground" : "text-muted-foreground")}>
                {row.label}
              </p>
              <div className="relative h-10 overflow-hidden rounded-xl border bg-background">
                <div
                  className={cn(
                    "absolute top-1 bottom-1 left-1 flex w-[calc(100%-8px)] justify-end transition-transform duration-1000",
                    row.cls,
                    moved ? "translate-x-0" : "translate-x-[calc(-100%+32px)]"
                  )}
                >
                  <span
                    className={cn("size-8 rounded-lg", row.good ? "bg-primary" : "bg-muted-foreground/40")}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <PanelLabel>Длительности</PanelLabel>
        <ul className="space-y-3">
          {[
            ["500ms", "Положение и раскладка"],
            ["600–800ms", "Появление секций"],
            ["300ms", "Цвет и прозрачность"],
            ["60ms", "Шаг между пунктами меню"],
          ].map(([d, l]) => (
            <li key={d} className="flex items-center justify-between gap-3">
              <span className="body-6 text-muted-foreground">{l}</span>
              <span className="caption-3 rounded-md border bg-background px-2 py-0.5 font-mono">{d}</span>
            </li>
          ))}
        </ul>
        <div
          className={cn(
            "mt-6 flex items-center justify-center rounded-xl border bg-background p-4 transition-transform duration-500 hover:-translate-y-1 active:scale-[0.98]",
            EASE
          )}
        >
          <span className="caption-1 inline-flex items-center gap-2 text-muted-foreground">
            <CursorClick className="size-4" /> Наведите и нажмите
          </span>
        </div>
      </Panel>
    </div>
  );
}

/* ───────────────────────── Компоненты ───────────────────────── */

function Components() {
  const [notify, setNotify] = useState(true);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <PanelLabel>Кнопки</PanelLabel>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Button>Основная</Button>
            <Button variant="secondary">Вторичная</Button>
            <Button variant="outline">Контурная</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Ссылка</Button>
            <Button variant="destructive">Удалить</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg">
              <Play className="size-5" weight="fill" /> Запустить код
            </Button>
            <Button>
              Далее <ArrowRight className="size-4" />
            </Button>
            <Button size="sm" variant="outline">
              <Lightbulb className="size-4" /> Подсказка
            </Button>
            <Button size="icon" variant="outline" aria-label="Поиск">
              <MagnifyingGlass className="size-5" />
            </Button>
            <Button disabled>Недоступно</Button>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelLabel>Бейджи и статусы</PanelLabel>
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge>Новое</Badge>
            <Badge variant="secondary">Уровень 2</Badge>
            <Badge variant="success">Решено</Badge>
            <Badge variant="destructive">Ошибка</Badge>
            <Badge variant="outline">Черновик</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <DifficultyBadge difficulty="easy" showXP />
            <DifficultyBadge difficulty="medium" showXP />
            <DifficultyBadge difficulty="hard" showXP />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { icon: Clock, label: "Не начат", tone: "border-border bg-muted/40 text-muted-foreground" },
              { icon: Rocket, label: "В процессе", tone: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
              { icon: CheckCircle, label: "Завершён", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
              { icon: Lock, label: "Закрыт", tone: "border-border bg-background text-muted-foreground" },
            ].map(({ icon: Icon, label, tone }) => (
              <span
                key={label}
                className={cn("caption-3 inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1", tone)}
              >
                <Icon className="size-4" weight="bold" /> {label}
              </span>
            ))}
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelLabel>Поля ввода</PanelLabel>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()} noValidate>
          <div className="space-y-2">
            <Label htmlFor="ds-name">Имя и фамилия</Label>
            <Input id="ds-name" placeholder="Мария Соколова" />
            <p className="caption-2 text-muted-foreground">Так вас увидят в рейтинге.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ds-email">Электронная почта</Label>
            <Input id="ds-email" type="email" defaultValue="maria@school" aria-invalid="true" aria-describedby="ds-email-error" />
            <p id="ds-email-error" className="caption-2 inline-flex items-center gap-1 text-destructive">
              <Warning className="size-4" /> Проверьте адрес: после @ нужен домен, например school.ru
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Уровень</Label>
              <Select defaultValue="2">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Начальный</SelectItem>
                  <SelectItem value="2">Базовый</SelectItem>
                  <SelectItem value="3">Продвинутый</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-disabled">Заблокировано</Label>
              <Input id="ds-disabled" disabled placeholder="Недоступно" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ds-note">Комментарий</Label>
            <Textarea id="ds-note" rows={3} placeholder="Опишите, где застряли" />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <Label htmlFor="ds-switch" className="body-5">
              Уведомлять о новых модулях
            </Label>
            <Switch id="ds-switch" checked={notify} onCheckedChange={setNotify} />
          </div>
        </form>
      </Panel>

      <Panel>
        <PanelLabel>Аккордеон и вкладки</PanelLabel>
        <Tabs defaultValue="theory" className="mb-6">
          <TabsList>
            <TabsTrigger value="theory">Теория</TabsTrigger>
            <TabsTrigger value="tasks">Задания</TabsTrigger>
            <TabsTrigger value="hints">Подсказки</TabsTrigger>
          </TabsList>
          <TabsContent value="theory" className="body-6 pt-3 text-muted-foreground">
            Цикл for проходит по элементам последовательности по порядку.
          </TabsContent>
          <TabsContent value="tasks" className="body-6 pt-3 text-muted-foreground">
            6 заданий: от вывода чисел до подсчёта суммы.
          </TabsContent>
          <TabsContent value="hints" className="body-6 pt-3 text-muted-foreground">
            Подсказка снижает награду за задание.
          </TabsContent>
        </Tabs>
        <Accordion type="single" collapsible defaultValue="q1">
          <AccordionItem value="q1">
            <AccordionTrigger>Как открывается следующий уровень?</AccordionTrigger>
            <AccordionContent>Когда пройдены все 10 модулей текущего уровня.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="q2">
            <AccordionTrigger>Где выполняется код?</AccordionTrigger>
            <AccordionContent>Прямо в браузере, через Pyodide. Устанавливать Python не нужно.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </Panel>
    </div>
  );
}

/* ───────────────────────── Состояния ───────────────────────── */

function Feedback() {
  const { toast } = useToast();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel className="space-y-4 lg:col-span-2">
        <PanelLabel>Сообщения</PanelLabel>
        <Alert>
          <Info className="size-4" />
          <AlertTitle>Тесты пройдены: 5 из 5</AlertTitle>
          <AlertDescription>Решение сохранено, за задание начислено 20 XP.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <Warning className="size-4" />
          <AlertTitle>Тест 3 не пройден</AlertTitle>
          <AlertDescription>Ожидалось 15, получено 12. Проверьте условие выхода из цикла.</AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() =>
              toast({ title: "Модуль пройден", description: "Открыт модуль «Списки»." })
            }
          >
            <Bell className="size-4" /> Показать уведомление
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast({
                variant: "destructive",
                title: "Не удалось сохранить",
                description: "Нет соединения. Повторите через минуту.",
              })
            }
          >
            <Warning className="size-4" /> Показать ошибку
          </Button>
        </div>
      </Panel>
      <Panel>
        <PanelLabel>Прогресс</PanelLabel>
        <div className="space-y-6">
          {[
            ["Начальный уровень", 70],
            ["Модуль «Циклы»", 33],
            ["До уровня 6", 86],
          ].map(([label, value]) => (
            <div key={label} className="space-y-2">
              <div className="flex justify-between">
                <span className="body-5">{label}</span>
                <span className="caption-3 font-mono text-muted-foreground">{value}%</span>
              </div>
              <Progress value={Number(value)} className="h-2 bg-foreground/10" />
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <PanelLabel>Загрузка</PanelLabel>
        <div className="space-y-4 rounded-xl border p-4" role="status" aria-busy="true" aria-label="Загрузка карточки">
          <div className="flex justify-between gap-4">
            <div className="h-5 w-2/3 animate-pulse rounded-md bg-foreground/10" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-foreground/10" />
          </div>
          <div className="h-3 w-full animate-pulse rounded-sm bg-foreground/10" />
          <div className="h-3 w-4/5 animate-pulse rounded-sm bg-foreground/10" />
          <div className="h-10 w-full animate-pulse rounded-md bg-foreground/10" />
        </div>
      </Panel>
      <Panel className="lg:col-span-2">
        <PanelLabel>Пустое состояние</PanelLabel>
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Trophy className="size-6" weight="duotone" />
          </span>
          <div className="space-y-1">
            <p className="title-2">Достижений пока нет</p>
            <p className="body-6 max-w-sm text-muted-foreground">
              Решите первое задание в модуле «Вывод на экран», и здесь появится первая награда.
            </p>
          </div>
          <Button size="sm">
            Перейти к модулям <ArrowUpRight className="size-4" />
          </Button>
        </div>
      </Panel>
    </div>
  );
}

/* ───────────────────────── Продукт ───────────────────────── */

const SAMPLE_MODULE = (id: string, title: string, topic: string, description: string): Module => ({
  id,
  title,
  topic,
  description,
  level: 1,
  order_index: 1,
  is_published: true,
  created_by: "design",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
});

const SAMPLE_MODULES = [
  {
    module: SAMPLE_MODULE("design-1", "Вывод на экран", "print и форматирование", "Первые программы: выводим текст, числа и собираем строки."),
    status: "completed" as const,
    tasks: 5,
  },
  {
    module: SAMPLE_MODULE("design-2", "Цикл for", "range и перебор", "Повторяем действия заданное число раз и обходим последовательности."),
    status: "in_progress" as const,
    tasks: 6,
  },
  {
    module: SAMPLE_MODULE("design-3", "Списки", "методы и срезы", "Храним много значений в одной переменной и учимся их менять."),
    status: "not_started" as const,
    tasks: 5,
  },
];

const ACHIEVEMENTS: { icon: IconType; title: string; earned: boolean }[] = [
  { icon: Flag, title: "Первый шаг", earned: true },
  { icon: Fire, title: "Серия 7 дней", earned: true },
  { icon: Target, title: "Без подсказок", earned: false },
  { icon: Medal, title: "Уровень пройден", earned: false },
];

function Product() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {SAMPLE_MODULES.map((m) => (
          <div key={m.module.id} className="pointer-events-none min-w-0 select-none" aria-hidden="true">
            <ModuleCard module={m.module} status={m.status} tasksCount={m.tasks} />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelLabel>Статистика ученика</PanelLabel>
          <dl className="grid grid-cols-2 gap-3">
            {[
              { icon: Lightning, label: "Опыт", value: "1 245 XP" },
              { icon: Star, label: "Уровень", value: "6" },
              { icon: CheckCircle, label: "Решено", value: "37" },
              { icon: Fire, label: "Серия", value: "4 дня" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl border bg-background p-3">
                <dt className="caption-4 inline-flex items-center gap-1 text-muted-foreground">
                  <Icon className="size-4" /> {label}
                </dt>
                <dd className="title-1 font-mono">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel>
          <PanelLabel>Достижения</PanelLabel>
          <div className="grid grid-cols-4 gap-3">
            {ACHIEVEMENTS.map(({ icon: Icon, title, earned }) => (
              <div key={title} className="space-y-2 text-center">
                <span
                  className={cn(
                    "mx-auto flex size-12 items-center justify-center rounded-2xl",
                    earned ? "bg-primary text-primary-foreground" : "border border-dashed bg-background text-muted-foreground"
                  )}
                >
                  <Icon className="size-6" weight={earned ? "fill" : "regular"} />
                </span>
                <p className="caption-5 text-muted-foreground">{title}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelLabel>Редактор и тесты</PanelLabel>
          <div className="overflow-hidden rounded-xl border bg-background">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <Textbox className="size-4 text-muted-foreground" />
              <span className="caption-4 font-mono text-muted-foreground">solution.py</span>
            </div>
            <pre className="caption-5 overflow-x-auto p-3 font-mono">
              <span className="text-primary">def</span> total(nums):{"\n"}
              {"    "}<span className="text-primary">return</span> sum(nums)
            </pre>
            <ul className="space-y-1 border-t p-3">
              {["total([1, 2]) == 3", "total([]) == 0"].map((t) => (
                <li key={t} className="caption-5 flex items-center gap-2 font-mono">
                  <CheckCircle className="size-4 text-emerald-600 dark:text-emerald-400" weight="fill" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ───────────────────────── Страница ───────────────────────── */

export function DesignSystem() {
  const mainRef = useRef<HTMLElement>(null);
  const sections: { id: string; title: string; description: string; node: ReactNode }[] = [
    { id: "principles", title: "Принципы", description: "Четыре правила, на которых держатся все решения ниже.", node: <Principles /> },
    { id: "colors", title: "Цвета", description: "Семантические токены из globals.css. Значения обновляются при смене темы, нажмите, чтобы скопировать.", node: <Colors /> },
    { id: "typography", title: "Типографика", description: "Каждый текст использует именованный стиль. Классы определены один раз в globals.css.", node: <Typography /> },
    { id: "spacing", title: "Отступы", description: "Тринадцать шагов. Значений между ними нет.", node: <Spacing /> },
    { id: "radius", title: "Радиусы", description: "Только значения Tailwind и формула для вложенных форм.", node: <Radius /> },
    { id: "icons", title: "Иконки", description: "Одна библиотека, одинаковая толщина линий во всём интерфейсе.", node: <Icons /> },
    { id: "motion", title: "Движение", description: "Переходы замедляются к концу. При prefers-reduced-motion движение отключается.", node: <Motion /> },
    { id: "components", title: "Компоненты", description: "Базовые элементы на shadcn/ui со всеми состояниями: наведение, нажатие, фокус, ошибка.", node: <Components /> },
    { id: "feedback", title: "Состояния", description: "Сообщения конкретны: что произошло и что делать дальше. Загрузка повторяет форму контента.", node: <Feedback /> },
    { id: "product", title: "Продукт", description: "Настоящие компоненты CodeSensei на примерных данных.", node: <Product /> },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <a
        href="#ds-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        К содержимому
      </a>
      <div className="px-4 pt-4">
        <SectionNav />
      </div>
      <main id="ds-main" ref={mainRef} className="container mx-auto max-w-6xl space-y-24 px-4">
        <Hero />
        {sections.map((s, i) => (
          <Section key={s.id} id={s.id} index={i + 1} title={s.title} description={s.description}>
            {s.node}
          </Section>
        ))}
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t pt-8">
          <p className="caption-2 text-muted-foreground">
            Правила: PRD, раздел 18, и навык landing-page-design.
          </p>
          <div className="flex items-center gap-2">
            <Link href="/" className="caption-1 text-primary hover:underline">
              На главную
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
