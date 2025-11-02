import type { ReactNode } from "react";

// Отключаем кеширование для всех admin страниц, чтобы сессия всегда проверялась
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

