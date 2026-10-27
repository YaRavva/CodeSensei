import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link href="/">
          <ArrowLeft className="size-4" />
          На главную
        </Link>
      </Button>
      <h1 className="text-balance text-3xl font-bold md:text-4xl">Политика конфиденциальности</h1>
      <div className="mt-8 space-y-6 text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Какие данные мы собираем</h2>
          <p>
            Для работы аккаунта хранятся email, имя профиля, а также результаты обучения: решения
            задач, очки опыта, уровни и достижения. Код ученика хранится только для проверки и
            разбора и не публикуется.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Зачем нам эти данные</h2>
          <p>
            Данные нужны, чтобы показывать прогресс, начислять очки, формировать лидерборд и
            сохранять учебный путь между входами. Мы не продаём и не передаём персональные данные
            третьим лицам.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Удаление данных</h2>
          <p>
            Вы можете удалить аккаунт и связанные с ним данные в любой момент. Обратитесь к учителю
            или администратору платформы, и данные будут удалены в разумный срок.
          </p>
        </section>
      </div>
    </div>
  );
}
