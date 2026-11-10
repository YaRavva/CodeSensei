"use client";

import { Editor, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
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

loader.config({ monaco });

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
  const [mounted, setMounted] = useState(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Внешнее изменение кода (сброс, загрузка сохранённой попытки, смена задания)
  // попадает в редактор только тогда, когда содержимое действительно отличается.
  // Сравнение с содержимым редактора, а не флаг «изменено изнутри»: React
  // выполняет эффект уже после того, как обработчик снял флаг, и setValue
  // перезаписывал бы весь текст на каждое нажатие клавиши — курсор прыгал бы
  // в конец строки и символы вводились не туда, где стоял курсор.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === undefined) return;
    if (editor.getValue() !== value) {
      editor.setValue(value);
    }
  }, [value]);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  const handleEditorChange = (val: string | undefined) => {
    onChange?.(val);
  };

  const getEditorTheme = () => {
    if (!mounted) return "vs-dark";
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

  if (!mounted) {
    return (
      <div className={`border rounded-md bg-muted ${className}`} style={{ height }}>
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
