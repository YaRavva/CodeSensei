"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useLayoutEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

/** Тема берётся из класса на html: скрипт темы ставит его до первой отрисовки. */
function useIsDark() {
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useLayoutEffect(() => {
    if (theme !== "system") {
      setIsDark(theme === "dark");
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(media.matches);
    const onChange = (event: MediaQueryListEvent) => setIsDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return isDark;
}

function CodeBlock({
  language,
  code,
  isDark,
}: {
  language: string;
  code: string;
  isDark: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl border bg-background">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <span className="caption-3 uppercase tracking-wider text-primary">{language}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-md px-2 py-1 caption-4 text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? <Check size={16} weight="bold" /> : <Copy size={16} />}
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>
      <SyntaxHighlighter
        style={(isDark ? oneDark : oneLight) as Record<string, React.CSSProperties>}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: "12px 16px",
          background: "transparent",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          lineHeight: "20px",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

/** Стабильный якорь заголовка: кириллица в id допустима и переживает перерисовку. */
function headingSlug(children: React.ReactNode): string {
  const text = Array.isArray(children) ? children.join(" ") : String(children ?? "");
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") || "section"
  );
}

/**
 * Единый рендер markdown для теории и условия задания.
 * Подсветка блоков кода — Prism, как и раньше; редактор Monaco она не касается.
 */
export function Markdown({
  source,
  className,
  headingIdPrefix,
}: {
  source: string;
  className?: string;
  /** Оглавление теории ищет заголовки по id, поэтому они ставятся при рендере. */
  headingIdPrefix?: string;
}) {
  const isDark = useIsDark();
  // Номер строки в исходнике делает якорь уникальным и не зависит от того,
  // сколько раз React перерисовал дерево.
  const headingId = (
    children: React.ReactNode,
    node?: { position?: { start: { line: number } } }
  ) =>
    headingIdPrefix
      ? `${headingIdPrefix}-${headingSlug(children)}-${node?.position?.start.line ?? 0}`
      : undefined;

  return (
    <div className={cn("body-6 text-muted-foreground", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h1: ({ children, node }) => (
            <h2 id={headingId(children, node)} className="heading-5 mt-6 mb-3 text-foreground">
              {children}
            </h2>
          ),
          h2: ({ children, node }) => (
            <h2
              id={headingId(children, node)}
              className="heading-6 mt-6 mb-3 border-l-2 border-primary pl-3 text-foreground"
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => <h3 className="title-2 mt-4 mb-2 text-foreground">{children}</h3>,
          h4: ({ children }) => <h4 className="title-3 mt-4 mb-2 text-foreground">{children}</h4>,
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-6">{children}</ol>,
          hr: () => <hr className="my-6 border-border" />,
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-2 border-primary pl-4">{children}</blockquote>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-primary underline underline-offset-2 hover:no-underline"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border">
              <table className="w-full caption-2">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b bg-muted px-3 py-2 text-left font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border-b px-3 py-2 align-top">{children}</td>,
          code({ className: codeClassName, children, ...rest }) {
            const match = /language-(\w+)/.exec(codeClassName || "");
            const text = String(children).replace(/\n$/, "");
            if (match) {
              return <CodeBlock language={match[1]} code={text} isDark={isDark} />;
            }
            return (
              <code
                className={cn(
                  "rounded-sm bg-primary/10 px-1 py-0.5 font-mono text-xs font-medium text-primary",
                  codeClassName
                )}
                {...rest}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
