import { BookOpen, Code2, Trophy } from "lucide-react";
import { ScrollReveal } from "@/components/landing/scroll-reveal";

interface Step {
  icon: typeof Code2;
  title: string;
  body: string;
}

const steps: Step[] = [
  {
    icon: BookOpen,
    title: "Выберите модуль",
    body: "Темы внутри — шаг за шагом: сначала простое, потом всё интереснее. Уровень сложности виден заранее.",
  },
  {
    icon: Code2,
    title: "Пишите код в браузере",
    body: "Никакой установки и настройки. Редактор, тесты и проверка — всё прямо на странице урока.",
  },
  {
    icon: Trophy,
    title: "Получайте XP и уровни",
    body: "За успешные решения начисляются очки. Достижения и место в лидерборде добавляют азарта, а не отвлекают от учёбы.",
  },
];

export function LandingHowItWorks() {
  return (
    <section className="border-y bg-muted/30">
      <div className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
        <ScrollReveal>
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">В три шага</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-muted-foreground">
              С первого знакомства до первого уровня — меньше, чем кажется.
            </p>
          </div>
        </ScrollReveal>
        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {steps.map((s, i) => (
            <ScrollReveal key={s.title} delay={i * 100}>
              <div className="relative h-full rounded-2xl border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <s.icon className="size-6 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">Шаг {i + 1}</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
                <p className="text-muted-foreground">{s.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
