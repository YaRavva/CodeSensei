import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t">
      <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-3 md:flex-row">
        <div className="flex items-center">
          <span className="text-sm font-bold">CodeSensei</span>
        </div>
        <nav
          aria-label="Правовая информация"
          className="flex flex-wrap items-center justify-center gap-2 text-xs"
        >
          <Link
            href="/privacy"
            className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Конфиденциальность
          </Link>
          <Link
            href="/terms"
            className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Условия использования
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">Изучайте Python в браузере</p>
      </div>
    </footer>
  );
}
