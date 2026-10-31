"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const iconTransition =
  "absolute inset-0 size-5 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Избегаем hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Определяем, какая тема активна
  const getCurrentTheme = () => {
    if (!mounted) return "light";
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  };

  const currentTheme = getCurrentTheme();
  const isDark = currentTheme === "dark";

  const toggleTheme = () => {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Переключить тему">
      <span className="relative size-5">
        <Sun
          className={cn(
            iconTransition,
            isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
          )}
          aria-hidden="true"
        />
        <Moon
          className={cn(
            iconTransition,
            isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          )}
          aria-hidden="true"
        />
      </span>
      <span className="sr-only">Переключить тему</span>
    </Button>
  );
}
