import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { Button } from "@/components/ui/button";

export function LandingFinalCta() {
  return (
    <section className="container mx-auto max-w-6xl px-4 pb-16 md:pb-24">
      <ScrollReveal>
        <div className="rounded-3xl border bg-muted/40 p-8 text-center md:p-16">
          <h2 className="mx-auto max-w-[680px] text-3xl font-bold leading-tight md:text-5xl">
            Первый рабочий код — уже к концу первого урока
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Абсолютно бесплатно, без карты и скрытых платежей. Подходит для школьников с 7 класса и
            взрослых новичков.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="h-11 px-6 text-base font-semibold">
              <Link href="/register">
                Начать бесплатно
                <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-11 px-6 text-base font-medium">
              <Link href="/login">У меня уже есть аккаунт</Link>
            </Button>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
