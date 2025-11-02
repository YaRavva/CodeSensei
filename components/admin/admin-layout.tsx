import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ReactNode } from "react";

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Админ-панель</h1>
        <nav className="flex gap-4 border-b">
          <Button variant="ghost" asChild>
            <Link href="/admin/modules">Модули</Link>
          </Button>
        </nav>
      </div>
      {children}
    </div>
  );
}
