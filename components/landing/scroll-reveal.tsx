"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Задержка перед стартом анимации (мс). */
  delay?: number;
}

/**
 * Обёртка секции по B7: подъём на 32px и затухание 0 → 100 за 600–800мс
 * на базовой кривой, срабатывает один раз через IntersectionObserver.
 * Уважает prefers-reduced-motion: при нём просто показывает контент.
 */
export function ScrollReveal({ children, className, delay = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.15 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "motion-reduce:transition-none",
        revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{
        transitionProperty: "opacity, transform",
        transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)",
        transitionDuration: "700ms",
        transitionDelay: revealed ? `${delay}ms` : "0ms",
      }}
    >
      {children}
    </div>
  );
}
