import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/">
          <ArrowLeft className="size-4" />
          На главную
        </Link>
      </Button>
      <h1 className="text-balance text-3xl font-bold md:text-4xl">Условия использования</h1>
      <div className="mt-4 text-sm text-muted-foreground">Последнее обновление: 2026-10-26</div>
      <div className="mt-8 space-y-6 text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">О сервисе</h2>
          <p>
            CodeSensei — интерактивный тренажёр по Python для школьников. Сервис помогает изучать
            основы языка, решать задачи и отслеживать прогресс через очки опыта, уровни и
            достижения.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Правила использования</h2>
          <p>
            Учётная запись предназначена для личного учебного использования. Не размещайте
            оскорбительный или посторонний контент, не пытайтесь нарушить работу платформы и чужие
            данные.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Изменение правил</h2>
          <p>
            Условия могут обновляться. Актуальная версия всегда доступна на этой странице, о
            существенных изменениях мы сообщаем на платформе.
          </p>
        </section>
      </div>
    </div>
  );
}
