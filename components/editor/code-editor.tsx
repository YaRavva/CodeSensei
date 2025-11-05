"use client";

import { Editor } from "@monaco-editor/react";
import { loader } from "@monaco-editor/react";
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

// Настраиваем loader для Monaco Editor с правильными путями
if (typeof window !== "undefined") {
  loader.config({
    paths: {
      vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.54.0/min/vs",
    },
  });

  // Перехватываем require.js для Monaco Editor, чтобы игнорировать загрузку проблемных модулей
  const originalRequire = (window as any).require;
  if (originalRequire && originalRequire.config) {
    const originalRequireFunc = originalRequire;
    (window as any).require = function(deps: string[], callback?: Function, errback?: Function) {
      // Фильтруем проблемные модули
      const filteredDeps = deps.filter(
        (dep) => 
          !dep.includes("stackframe") && 
          !dep.includes("error-stack-parser") &&
          !dep.includes("error-stack-parser/")
      );
      
      // Если все модули были отфильтрованы, возвращаем пустой результат
      if (filteredDeps.length === 0 && deps.length > 0) {
        if (callback) {
          callback([]);
        }
        return;
      }
      
      // Если есть модули для загрузки, загружаем их
      if (filteredDeps.length > 0) {
        return originalRequireFunc(filteredDeps, callback, errback);
      }
      
      return originalRequireFunc(deps, callback, errback);
    };
    
    // Копируем методы require
    Object.setPrototypeOf((window as any).require, originalRequireFunc);
    Object.assign((window as any).require, originalRequireFunc);
  }
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

  // Избегаем hydration mismatch и настраиваем обработку ошибок загрузки
  useEffect(() => {
    setMounted(true);
    
    // Перехватываем console.error для подавления ошибок загрузки модулей Monaco
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(" ");
      if (
        message.includes("Loading \"stackframe\" failed") ||
        message.includes("Loading \"error-stack-parser\" failed") ||
        message.includes("error-stack-parser") ||
        message.includes("stackframe")
      ) {
        // Подавляем ошибки загрузки этих модулей
        return;
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
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
          fontSize: 16,
          tabSize: 4,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          fontFamily: "'Ubuntu Mono', monospace",
          padding: { top: 12, bottom: 12 },
          suggest: {
            showWords: true,
            showSnippets: true,
          },
          quickSuggestions: true,
          parameterHints: { enabled: true },
          // Отключаем функции, которые требуют stackframe для обработки ошибок
          renderValidationDecorations: "off",
          wordBasedSuggestions: "off",
        }}
      />
    </div>
  );
}

