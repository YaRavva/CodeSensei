import { ChevronDown } from "lucide-react";
import { ScrollReveal } from "@/components/landing/scroll-reveal";

const faqs = [
  {
    q: "Что нужно, чтобы начать заниматься?",
    a: "Только браузер и аккаунт. Всё выполняется онлайн, устанавливать ничего не нужно.",
  },
  {
    q: "Для какого возраста подходит тренажёр?",
    a: "Курс рассчитан на школьников 7–9 классов, но формат подходит и начинающим постарше. Уровень сложности видно до старта модуля.",
  },
  {
    q: "Это бесплатно?",
    a: "Да, заниматься можно бесплатно, в своём темпе. Подписок и платных курсов нет.",
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
    <section className="container mx-auto max-w-4xl px-4 py-16 md:py-24">
      <ScrollReveal>
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Частые вопросы</h2>
          <p className="mt-3 text-lg text-muted-foreground">Ответили на главные сомнения.</p>
        </div>
      </ScrollReveal>
      <div className="space-y-4">
        {faqs.map((item, index) => (
          <ScrollReveal key={item.q} delay={index * 60}>
            <details className="group rounded-2xl border bg-card p-6 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-primary/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md text-left font-semibold transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown
                  className="size-5 shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-4 text-muted-foreground">{item.a}</p>
            </details>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
