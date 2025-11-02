"use client";

import { Editor } from "@monaco-editor/react";
import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  height?: string;
  language?: string;
  readOnly?: boolean;
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  height = "400px",
  language = "python",
  readOnly = false,
  className,
}: CodeEditorProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Избегаем hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Определяем тему редактора на основе системной темы
  const getEditorTheme = () => {
    if (!mounted) return "vs-dark";
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "vs-dark"
        : "light";
    }
    return theme === "dark" ? "vs-dark" : "light";
  };

  if (!mounted) {
    return (
      <div
        className={`border rounded-md bg-muted ${className}`}
        style={{ height }}
      >
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Загрузка редактора...
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-md overflow-hidden ${className}`}>
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={onChange}
        theme={getEditorTheme()}
        options={{
          readOnly,
          minimap: { enabled: false },
          lineNumbers: "on",
          wordWrap: "on",
          fontSize: 14,
          tabSize: 4,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          fontFamily: "Monaco, Menlo, 'Courier New', monospace",
          padding: { top: 12, bottom: 12 },
          suggest: {
            showWords: true,
            showSnippets: true,
          },
        }}
      />
    </div>
  );
}

