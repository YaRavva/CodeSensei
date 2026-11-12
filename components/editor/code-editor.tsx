"use client";

import { Editor, loader } from "@monaco-editor/react";
import type * as monaco from "monaco-editor";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  height?: string;
  language?: string;
  readOnly?: boolean;
  className?: string;
  path?: string;
}

// Monaco запускает свой worker через blob-URL и не может разрешить относительные
// импорты собранного Turbopack чанка, поэтому worker монтируется здесь и
// передаётся редактору напрямую.
export function CodeEditor({
  value,
  onChange,
  height = "400px",
  language = "python",
  readOnly = false,
  className,
  path,
}: CodeEditorProps) {
  const { theme } = useTheme();
  const [ready, setReady] = useState(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  // Значение, отправленное редактором вверх, и значение, которое редактор уже
  // показал. Пока React отдаёт более старое значение, записывать его обратно
  // нельзя: это откатывало бы текст к предыдущему состоянию и сбрасывало курсор.
  const emittedRef = useRef<string | undefined>(undefined);

  // Пакет monaco-editor обращается к self при вычислении модуля, поэтому статический
  // импорт ронял серверный рендер страницы модуля (HTTP 500 при живом клиенте).
  useEffect(() => {
    let active = true;
    import("monaco-editor").then((monaco) => {
      if (!active) return;
      self.MonacoEnvironment = {
        getWorker() {
          return new Worker(new URL("./monaco-editor.worker.ts", import.meta.url), {
            type: "module",
            name: "editorWorkerService",
          });
        },
      };
      loader.config({ monaco });
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Внешнее изменение кода (сброс, загрузка сохранённой попытки, смена задания)
  // попадает в редактор только тогда, когда содержимое действительно отличается.
  // Пока значение совпадает с тем, что редактор уже отправил, изменение пришло
  // из редактора: React отдаёт его с задержкой, и setValue по устаревшему value
  // перезаписывал бы весь текст — символы вводились не туда, где стоял курсор.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === undefined) return;
    if (value === emittedRef.current) return;
    if (editor.getValue() !== value) {
      editor.setValue(value);
    }
  }, [value]);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  const handleEditorChange = (val: string | undefined) => {
    emittedRef.current = val;
    onChange?.(val);
  };

  const getEditorTheme = () => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "vs-dark" : "light";
    }
    return theme === "dark" ? "vs-dark" : "light";
  };

  const editorOptions = useMemo(
    () => ({
      readOnly,
      minimap: { enabled: false },
      lineNumbers: "on" as const,
      wordWrap: "on" as const,
      fontSize: 16,
      tabSize: 4,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      fontFamily: "'Geist Mono', ui-monospace, monospace",
      padding: { top: 12, bottom: 12 },
      suggest: {
        showWords: true,
        showSnippets: true,
      },
      quickSuggestions: true,
      parameterHints: { enabled: true },
      renderValidationDecorations: "on" as const,
      wordBasedSuggestions: "currentDocument" as const,
    }),
    [readOnly]
  );

  if (!ready) {
    return (
      <div className={`border rounded-md bg-muted ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Загрузка редактора...
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-md overflow-hidden ${className}`} style={{ height }}>
      <Editor
        height="100%"
        language={language}
        defaultValue={value}
        onMount={handleEditorDidMount}
        onChange={handleEditorChange}
        theme={getEditorTheme()}
        path={path}
        options={editorOptions}
      />
    </div>
  );
}
