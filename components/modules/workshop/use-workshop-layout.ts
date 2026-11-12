"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export const MIN_SPLIT = 28;
export const MAX_SPLIT = 68;
export const MIN_DOCK = 180;
const MIN_EDITOR = 140;

/**
 * Раскладка сетки задаётся инлайновым gridTemplateColumns, который перебил бы
 * адаптивные классы Tailwind, поэтому breakpoint читается в JS.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useLayoutEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/**
 * Высота рабочей области: окно минус всё, что стоит над и под ней.
 *
 * Страница модуля — единственный экран без прокрутки документа: прокручивается
 * только содержимое панелей. Пока документ прокручивался, sticky-шапка теряла
 * свой скроллпорт из-за react-remove-scroll, и меню аватара уезжало за экран.
 */
export function useShellHeight(bottomGap = 16) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const header = document.querySelector("header");
    const footer = document.querySelector("footer");

    const measure = () => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      const footerHeight = footer?.getBoundingClientRect().height ?? 0;
      setHeight(Math.max(560, Math.round(window.innerHeight - top - footerHeight - bottomGap)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (header) observer.observe(header);
    if (footer) observer.observe(footer);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [bottomGap]);

  return { ref, height };
}

/** Перетаскиваемая граница между условием и кодом и высота дока результатов. */
export function useResizablePanes() {
  const workRef = useRef<HTMLDivElement>(null);
  const dockBodyRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(44);
  const [dockHeight, setDockHeight] = useState(260);
  const [dockMax, setDockMax] = useState(MIN_DOCK);
  const dockManualRef = useRef(false);

  const maxDock = useCallback(() => {
    const room = workRef.current?.getBoundingClientRect().height ?? 0;
    const max = room ? Math.max(MIN_DOCK, Math.min(room * 0.62, room - MIN_EDITOR - 96)) : MIN_DOCK;
    setDockMax(Math.round(max));
    return max;
  }, []);

  const startSplit = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => {
      const rect = workRef.current?.getBoundingClientRect();
      if (!rect) return;
      const percent = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.max(MIN_SPLIT, Math.min(MAX_SPLIT, percent)));
    };
    const stop = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
    event.preventDefault();
  }, []);

  const nudgeSplit = useCallback((delta: number) => {
    setSplit((value) => Math.max(MIN_SPLIT, Math.min(MAX_SPLIT, value + delta)));
  }, []);

  const startDock = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      dockManualRef.current = true;
      const startY = event.clientY;
      const startHeight = dockHeight;
      const move = (moveEvent: PointerEvent) => {
        const next = startHeight + (startY - moveEvent.clientY);
        setDockHeight(Math.round(Math.max(MIN_DOCK, Math.min(maxDock(), next))));
      };
      const stop = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", stop);
        handle.removeEventListener("pointercancel", stop);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", stop);
      handle.addEventListener("pointercancel", stop);
      event.preventDefault();
    },
    [dockHeight, maxDock]
  );

  const nudgeDock = useCallback(
    (delta: number) => {
      dockManualRef.current = true;
      setDockHeight((value) => Math.round(Math.max(MIN_DOCK, Math.min(maxDock(), value + delta))));
    },
    [maxDock]
  );

  /** Подгоняет док под содержимое, пока пользователь не задал высоту вручную. */
  const fitDock = useCallback(() => {
    if (dockManualRef.current) return;
    const body = dockBodyRef.current;
    if (!body) return;
    const need = body.scrollHeight + 96;
    setDockHeight(Math.round(Math.max(MIN_DOCK, Math.min(maxDock(), need))));
  }, [maxDock]);

  useEffect(() => {
    const onResize = () => setDockHeight((value) => Math.min(value, maxDock()));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [maxDock]);

  return {
    workRef,
    dockBodyRef,
    split,
    dockHeight,
    dockMax,
    startSplit,
    nudgeSplit,
    startDock,
    nudgeDock,
    fitDock,
  };
}
