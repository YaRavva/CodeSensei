import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 py-10 md:flex-row">
        <div className="flex items-center">
          <span className="font-bold">CodeSensei</span>
        </div>
        <nav
          aria-label="Правовая информация"
          className="flex flex-wrap items-center justify-center gap-2 text-sm"
        >
          <Link
            href="/privacy"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Конфиденциальность
          </Link>
          <Link
            href="/terms"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Условия использования
          </Link>
        </nav>
        <p className="text-sm text-muted-foreground">Изучайте Python в браузере</p>
      </div>
    </footer>
  );
}
