"use client";

import { useEffect, useRef } from "react";

/**
 * Прокручивает страницу к блоку с результатами проверки, когда он появляется.
 *
 * Блок с результатами находится под редактором кода и на невысоком экране
 * оказывается за нижней границей окна: видна только верхняя кромка карточки,
 * и кажется, что проверка отобразилась не полностью. Прокрутка колесом над
 * редактором страницу не двигает, потому что её перехватывает Monaco, поэтому
 * переход к результатам делается явно.
 */
export function ScrollIntoViewOnMount({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const scrolledRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    scrolledRef.current = false;
    const frame = requestAnimationFrame(() => {
      if (scrolledRef.current) return;
      scrolledRef.current = true;
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
