"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useEffect } from "react";

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();

  // Принудительно обновляем профиль при монтировании на админ-странице
  // Это помогает синхронизировать профиль после OAuth
  useEffect(() => {
    if (user && !profile) {
      console.log("[AdminLayout] User exists but profile is missing, refreshing...");
      refreshProfile().catch((err) => {
        console.error("[AdminLayout] Error refreshing profile:", err);
      });
    } else if (user && profile) {
      console.log("[AdminLayout] Profile loaded:", { role: profile.role, display_name: profile.display_name });
    }
  }, [user, profile, refreshProfile]);

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
