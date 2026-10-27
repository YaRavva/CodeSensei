import {
  Award,
  CheckCircle2,
  Gauge,
  type LucideIcon,
  Puzzle,
  Rocket,
  ScrollText,
} from "lucide-react";
import { ScrollReveal } from "@/components/landing/scroll-reveal";

interface Benefit {
  icon: LucideIcon;
  title: string;
  body: string;
}

const benefits: Benefit[] = [
  {
    icon: Rocket,
    title: "Реальный прогресс с первого дня",
    body: "Первый рабочий скрипт — уже на первом уроке, а не после месяца теории. Видно XP и уровень сразу.",
  },
  {
    icon: Puzzle,
    title: "Сложность растёт вместе с вами",
    body: "Пять уровней: от простых функций до полноценных задач. Каждый модуль опирается на пройденное.",
  },
  {
    icon: Gauge,
    title: "Мгновенная проверка кода",
    body: "Решение запускается в браузере и проверяется автоматически. Ошибку видно сразу, а не на следующем уроке.",
  },
  {
    icon: ScrollText,
    title: "Понятные объяснения",
    body: "Каждая тема подана шаг за шагом, с примерами. Если что-то не получается — подсказка подскажет, как двигаться дальше.",
  },
];

export function LandingBenefits() {
  return (
    <section className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
      <ScrollReveal>
        <div className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-bold md:text-4xl">Зачем учить Python именно здесь</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Дальше — не просто чтение теории, а написание кода, который действительно запускается.
          </p>
        </div>
      </ScrollReveal>
      <div className="grid gap-6 md:grid-cols-2">
        {benefits.map((b, i) => (
          <ScrollReveal key={b.title} delay={i * 80}>
            <div className="h-full rounded-2xl border bg-card p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <b.icon className="size-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{b.title}</h3>
              <p className="text-muted-foreground">{b.body}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
