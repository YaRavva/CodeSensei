"use client";

import { ArrowRight, Play, Rocket } from "@phosphor-icons/react";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";

interface TheoryViewProps {
  level: number;
  title: string;
  topic: string;
  description: string;
  startLabel: string;
  allDone: boolean;
  avgScore?: number;
  timeSpent?: number;
  onStart: () => void;
}

export function TheoryView({
  level,
  title,
  topic,
  description,
  startLabel,
  allDone,
  avgScore,
  timeSpent,
  onStart,
}: TheoryViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [readPercent, setReadPercent] = useState(0);

  // Заголовки берутся из готового DOM: markdown может дать любой их набор,
  // а оглавление должно совпадать с ним один в один.
  // biome-ignore lint/correctness/useExhaustiveDependencies: описание — источник разметки, оглавление пересобирается вместе с ним
  useLayoutEffect(() => {
    const root = articleRef.current;
    if (!root) return;
    const found = Array.from(root.querySelectorAll("h2")).map((node) => ({
      id: node.id,
      text: node.textContent ?? "",
    }));
    setHeadings(found);
    setActiveId(found[0]?.id ?? null);
  }, [description]);

  /** Позиция заголовка внутри прокручиваемой колонны, не зависящая от offsetParent. */
  const topInScroller = (node: HTMLElement, scroller: HTMLElement) =>
    node.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;

  const onScroll = () => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const scrollable = scroller.scrollHeight - scroller.clientHeight;
    setReadPercent(scrollable > 0 ? Math.round((scroller.scrollTop / scrollable) * 100) : 100);
    let current: string | null = headings[0]?.id ?? null;
    for (const heading of headings) {
      const node = document.getElementById(heading.id);
      if (node && topInScroller(node, scroller) - 24 <= scroller.scrollTop) current = heading.id;
    }
    setActiveId(current);
  };

  const jump = (id: string) => {
    const scroller = scrollRef.current;
    const node = document.getElementById(id);
    if (!scroller || !node) return;
    scroller.scrollTo({ top: topInScroller(node, scroller) - 16, behavior: "smooth" });
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_240px]">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="cs-scroll min-h-0 overflow-y-auto px-6 py-8 md:px-10"
      >
        <div ref={articleRef} className="mx-auto max-w-[720px]">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 caption-3 uppercase tracking-wider text-primary">
            Теория · Уровень {level}
          </span>
          <h1 className="hero-heading-gradient heading-4 mt-4 md:heading-3">{title}</h1>
          <p className="mt-3 body-3 text-muted-foreground">{topic}</p>

          {(avgScore !== undefined || timeSpent !== undefined) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {avgScore !== undefined && (
                <span className="rounded-full border px-3 py-1 caption-4 text-muted-foreground">
                  Средний балл AI:{" "}
                  <span className="font-mono text-foreground">{avgScore.toFixed(0)}%</span>
                </span>
              )}
              {timeSpent !== undefined && (
                <span className="rounded-full border px-3 py-1 caption-4 text-muted-foreground">
                  Время в модуле:{" "}
                  <span className="font-mono text-foreground">
                    {Math.round(timeSpent / 60)} мин
                  </span>
                </span>
              )}
            </div>
          )}

          <hr className="my-6 border-border" />

          <Markdown source={description} headingIdPrefix="cs-theory" />

          <div className="mt-8 flex flex-wrap items-center gap-4 rounded-xl border bg-card p-6">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Rocket size={20} weight="duotone" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="title-3 text-foreground">
                {allDone ? "Модуль пройден" : "Теория прочитана — пора писать код"}
              </p>
              <p className="mt-1 caption-2 text-muted-foreground">
                {allDone
                  ? "Можно вернуться к любому заданию и улучшить решение."
                  : "Задание откроется рядом с редактором, результат будет закреплён внизу."}
              </p>
            </div>
            <Button onClick={onStart} className="shrink-0">
              {allDone ? <ArrowRight size={16} weight="bold" /> : <Play size={16} weight="fill" />}
              {startLabel}
            </Button>
          </div>
        </div>
      </div>

      <nav
        aria-label="Оглавление теории"
        className="cs-scroll hidden min-h-0 overflow-y-auto border-l p-4 xl:block"
      >
        <p className="pb-3 caption-3 uppercase tracking-wider text-muted-foreground">
          На этой странице
        </p>
        <ul className="space-y-1">
          {headings.map((heading) => (
            <li key={heading.id}>
              <button
                type="button"
                onClick={() => jump(heading.id)}
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-left caption-2 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeId === heading.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {heading.text}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t pt-3 caption-5 text-muted-foreground">
          Прочитано <span className="font-mono text-foreground">{readPercent}%</span>
        </p>
      </nav>
    </div>
  );
}
