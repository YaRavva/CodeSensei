import { ScrollReveal } from "@/components/landing/scroll-reveal";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "Раньше на уроках мы разбирали теорию и до кода почти не доходили. Здесь ребята запускают свой скрипт на первом же занятии, и это видно по глазам.",
    name: "Марина Ковалёва",
    role: "Учитель информатики, школа № 41",
    initials: "МК",
  },
  {
    quote:
      "Первые две недели я просто копировала примеры. Потом заметила, что уже сама придумываю, как разложить задачу на шаги, и перестала подсматривать.",
    name: "Даша Ильина",
    role: "9 класс, второй модуль",
    initials: "ДИ",
  },
  {
    quote:
      "Нравится, что проверка отвечает сразу и по делу. Не просто «неверно», а на каком тесте и что именно получилось вместо ожидаемого.",
    name: "Артём Соколов",
    role: "8 класс, курс с сентября",
    initials: "АС",
  },
];

export function LandingProof() {
  return (
    <section className="container mx-auto max-w-6xl px-4 py-16 md:py-24">
      <ScrollReveal>
        <div className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-bold md:text-4xl">Это учёба, а не тест на удачу</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Внутри всё устроено так, чтобы интерес не угасал с первых же уроков.
          </p>
        </div>
      </ScrollReveal>
      <div className="grid gap-6 md:grid-cols-3">
        {testimonials.map((item, index) => (
          <ScrollReveal key={item.name} delay={index * 80}>
            <figure className="flex h-full flex-col justify-between rounded-2xl border bg-card p-6">
              <blockquote className="text-muted-foreground">{item.quote}</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
                >
                  {item.initials}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{item.role}</span>
                </span>
              </figcaption>
            </figure>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
