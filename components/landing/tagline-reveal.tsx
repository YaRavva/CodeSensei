"use client";

import { useEffect, useRef, useState } from "react";

const TAGLINE = ["Каждый пройденный модуль", "открывает следующий уровень"];

/**
 * Секция B11 — задаёт «момент» крупным шрифтом, который при прокрутке
 * проявляется пословно: слова стартуют с приглушённого тона и по одному
 * становятся полным цветом, слева направо. IntersectionObserver + RAF не нужен.
 */
export function TaglineReveal() {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActive(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="container mx-auto max-w-6xl px-4 py-16 md:py-24">
      <p
        ref={containerRef}
        className="max-w-[680px] text-4xl font-bold leading-tight text-balance md:text-5xl"
      >
        {TAGLINE.map((line, li) => (
          <span key={li} className="block">
            {line.split(" ").map((word, wi) => (
              <span
                key={`${li}-${wi}`}
                className="inline-block"
                style={{
                  color: active ? "var(--foreground)" : "var(--muted-foreground)",
                  opacity: active ? 1 : 0.33,
                  transition:
                    "color 500ms cubic-bezier(0.22,1,0.36,1), opacity 500ms cubic-bezier(0.22,1,0.36,1)",
                  transitionDelay: active ? `${wi * 60 + li * 120}ms` : "0ms",
                }}
              >
                {word}&nbsp;
              </span>
            ))}
          </span>
        ))}
      </p>
    </section>
  );
}
