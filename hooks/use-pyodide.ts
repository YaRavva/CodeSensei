"use client";

import { useCallback, useEffect, useState } from "react";
import type { PythonRunner } from "@/lib/pyodide/setup";
import { setupPyodide } from "@/lib/pyodide/setup";

type Pyodide = PythonRunner;

let pyodideCache: Pyodide | null = null;
let loadPromise: Promise<Pyodide> | null = null;

declare global {
  interface Window {
    /** Появляется после загрузки скрипта pyodide.js с CDN. */
    loadPyodide?: (options: { indexURL: string }) => Promise<PythonRunner>;
  }
}

const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";

/** Отдельная функция: TypeScript не сужает тип свойства за её пределами. */
function getWindowLoader() {
  return window.loadPyodide;
}

async function loadPyodide(): Promise<Pyodide> {
  if (pyodideCache) {
    return pyodideCache;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    // Динамический импорт Pyodide (только на клиенте)
    if (typeof window === "undefined") {
      throw new Error("Pyodide может быть загружен только на клиенте");
    }

    try {
      // Проверяем, загружен ли уже Pyodide
      const loader = getWindowLoader();
      if (loader) {
        const pyodideInstance = await loader({ indexURL: PYODIDE_INDEX_URL });

        // stdout capture and input() from prepared lines (lib/pyodide/setup.ts)
        setupPyodide(pyodideInstance);

        pyodideCache = pyodideInstance;
        return pyodideInstance;
      }

      // Загружаем Pyodide напрямую с CDN
      const script = document.createElement("script");
      script.src = `${PYODIDE_INDEX_URL}pyodide.js`;
      script.async = true;
      script.setAttribute("data-pyodide-base-url", PYODIDE_INDEX_URL); // Добавляем этот атрибут

      const loadPromise = new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Pyodide script"));
      });

      document.head.appendChild(script);
      await loadPromise;

      // Теперь получаем доступ к глобальному объекту loadPyodide
      const loaderAfterScript = getWindowLoader();
      if (!loaderAfterScript) {
        throw new Error("Pyodide не загрузился: скрипт CDN не определил loadPyodide");
      }
      const pyodideInstance = await loaderAfterScript({ indexURL: PYODIDE_INDEX_URL });

      // stdout capture and input() from prepared lines (lib/pyodide/setup.ts)
      setupPyodide(pyodideInstance);

      pyodideCache = pyodideInstance;
      return pyodideInstance;
    } catch (error) {
      console.error("Error loading Pyodide:", error);
      throw new Error(
        `Failed to load Pyodide: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  })();

  return loadPromise;
}

interface UsePyodideReturn {
  pyodide: Pyodide | null;
  loading: boolean;
  error: Error | null;
  executeCode: (
    code: string,
    timeout?: number,
    stdin?: string[]
  ) => Promise<{
    output: string;
    error: string | null;
    executionTime: number;
  }>;
}

export function usePyodide(): UsePyodideReturn {
  const [pyodide, setPyodide] = useState<Pyodide | null>(pyodideCache);
  const [loading, setLoading] = useState(!pyodideCache);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (pyodideCache) {
      setPyodide(pyodideCache);
      setLoading(false);
      return;
    }

    setLoading(true);
    loadPyodide()
      .then((loadedPyodide) => {
        setPyodide(loadedPyodide);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
        console.error("Pyodide loading failed:", err);
      });
  }, []);

  const executeCode = useCallback(
    async (
      code: string,
      timeout: number = 10000,
      stdin: string[] = []
    ): Promise<{
      output: string;
      error: string | null;
      executionTime: number;
    }> => {
      if (!pyodide) {
        throw new Error("Pyodide не загружен");
      }

      const startTime = Date.now();

      try {
        // Сбрасываем буфер вывода и очищаем предыдущие ошибки
        try {
          pyodide.runPython("_stdout_capture.reset()");
        } catch {
          // Игнорируем ошибки при сбросе буфера
        }

        // Очищаем возможные остаточные переменные из предыдущих выполнений
        try {
          pyodide.runPython(`
try:
    # Очищаем тестовые переменные, если они остались
    del _test_result, _test_passed, _test_error, _test_expected, _test_compare
except:
    pass
`);
        } catch {
          // Игнорируем ошибки при очистке
        }

        // Lines returned by input(), one per call.
        pyodide.runPython(`_cs_set_stdin(${JSON.stringify(stdin)}, True)`);

        // Создаем промис для выполнения кода с timeout
        const executionPromise = pyodide.runPythonAsync(code);

        // Создаем промис для timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Превышено время выполнения (10 секунд)")), timeout);
        });

        // Ждем выполнения или timeout
        await Promise.race([executionPromise, timeoutPromise]);

        // Получаем вывод из stdout
        let output = "";
        try {
          const outputResult = pyodide.runPython("_stdout_capture.getvalue()");
          output = outputResult !== null && outputResult !== undefined ? String(outputResult) : "";
        } catch {
          // Если не удалось получить вывод, оставляем пустым
        }

        const executionTime = Date.now() - startTime;

        return {
          output: output.trim(),
          error: null,
          executionTime,
        };
      } catch (err) {
        const executionTime = Date.now() - startTime;

        // Улучшенная обработка ошибок Python
        let errorMessage = "";

        if (err instanceof Error) {
          errorMessage = err.message;

          // Извлекаем более понятное сообщение из traceback Python
          // Pyodide обычно включает traceback в сообщение об ошибке
          // Извлекаем последнюю строку с типом ошибки и сообщением
          const lines = errorMessage.split("\n");
          const errorLine = lines[lines.length - 1] || errorMessage;

          // Проверяем, есть ли traceback в сообщении
          const hasTraceback = errorMessage.includes("Traceback");

          if (hasTraceback || errorLine.trim()) {
            // Упрощаем сообщение, убирая технические детали
            if (errorLine.includes("UnboundLocalError")) {
              const match = errorLine.match(/UnboundLocalError: (.+)/);
              errorMessage = match ? `Ошибка: ${match[1]}` : errorLine;
            } else if (errorLine.includes("NameError")) {
              const match = errorLine.match(/NameError: (.+)/);
              errorMessage = match ? `Ошибка: ${match[1]}` : errorLine;
            } else if (errorLine.includes("SyntaxError")) {
              const match = errorLine.match(/SyntaxError: (.+)/);
              errorMessage = match ? `Синтаксическая ошибка: ${match[1]}` : errorLine;
            } else if (errorLine.includes("TypeError")) {
              const match = errorLine.match(/TypeError: (.+)/);
              errorMessage = match ? `Ошибка типа: ${match[1]}` : errorLine;
            } else if (errorLine.includes("IndentationError")) {
              const match = errorLine.match(/IndentationError: (.+)/);
              errorMessage = match ? `Ошибка отступов: ${match[1]}` : errorLine;
            } else {
              // Берем последнюю строку traceback как основное сообщение
              errorMessage = errorLine.trim();
            }
          } else {
            // Если нет traceback, используем исходное сообщение
            errorMessage = errorLine.trim() || errorMessage;
          }
        } else {
          errorMessage = String(err);
        }

        // Очищаем состояние Pyodide после ошибки, чтобы не блокировать следующие выполнения
        try {
          // Пытаемся очистить возможные глобальные переменные, которые могли остаться
          pyodide.runPython(`
try:
    del _test_result, _test_passed, _test_error, _test_expected
except:
    pass
`);
        } catch {
          // Игнорируем ошибки при очистке
        }

        return {
          output: "",
          error: errorMessage || "Произошла ошибка при выполнении кода",
          executionTime,
        };
      }
    },
    [pyodide]
  );

  return {
    pyodide,
    loading,
    error,
    executeCode,
  };
}
