import { ChevronDown } from "lucide-react";
import { ScrollReveal } from "@/components/landing/scroll-reveal";

const faqs = [
  {
    q: "Что нужно, чтобы начать заниматься?",
    a: "Только браузер и аккаунт. Всё выполняется онлайн, устанавливать ничего не нужно.",
  },
  {
    q: "Для какого возраста подходит тренажёр?",
    a: "Курс рассчитан на школьников 7–9 классов, но формат подходит и начинающим постарше. Уровни сложности регулируются.",
  },
  {
    q: "Это бесплатно?",
    a: "Да, абсолютно бесплатно. Начните заниматься без карты и скрытых платежей, а отменить участие — в любой момент.",
  },
  {
    q: "С чего начинается обучение?",
    a: "С первого модуля по основам Python. Дальше сложность растёт плавно, каждая тема опирается на пройденную.",
  },
  {
    q: "Что дают XP, уровни и достижения?",
    a: "Это обратная связь за успешные решения: сразу видно свой прогресс и что осталось пройти. Ничего не продаётся и не теряется.",
  },
  {
    q: "Смогу ли я заниматься на школьном компьютере?",
    a: "Да. Код запускается прямо в браузере, отдельной программы не нужно, подходит и для обычного ПК.",
  },
];

export function LandingFaq() {
  return (
    <section className="container mx-auto max-w-4xl px-4 py-16 md:py-20">
      <ScrollReveal>
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Частые вопросы</h2>
          <p className="mt-3 text-lg text-muted-foreground">Ответили на главные сомнения.</p>
        </div>
      </ScrollReveal>
      <div className="space-y-4">
        {faqs.map((f, i) => (
          <ScrollReveal key={f.q} delay={i * 60}>
            <details className="group rounded-2xl border bg-card p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="size-5 shrink-0 transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <p className="mt-4 text-muted-foreground">{f.a}</p>
            </details>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
