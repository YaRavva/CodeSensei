import { CheckCircle2, Sparkles, Target } from "lucide-react";
import { ScrollReveal } from "@/components/landing/scroll-reveal";

const proofItems = [
  {
    icon: Target,
    title: "Задач, которые решают сами ученики",
    value: "Задачу нужно написать самому, а не выбрать ответ.",
  },
  {
    icon: CheckCircle2,
    title: "Проверка, а не «по шаблону»",
    value: "Код реально запускается. Тесты показывают, что получилось.",
  },
  {
    icon: Sparkles,
    title: "За современный результат",
    value: "Понятный учебный путь с обратной связью на каждом уроке.",
  },
];

export function LandingProof() {
  return (
    <section className="container mx-auto max-w-6xl px-4 py-16 md:py-20">
      <ScrollReveal>
        <div className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-bold md:text-4xl">Это учёба, а не тест на удачу</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Внутри всё устроено так, чтобы увлечение не угасло после первого урока.
          </p>
        </div>
      </ScrollReveal>
      <div className="grid gap-6 md:grid-cols-3">
        {proofItems.map((p, i) => (
          <ScrollReveal key={p.title} delay={i * 80}>
            <div className="h-full rounded-2xl border bg-card p-6">
              <p.icon className="mb-4 size-8 text-primary" />
              <h3 className="mb-2 text-lg font-semibold">{p.title}</h3>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
