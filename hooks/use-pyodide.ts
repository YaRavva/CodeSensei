"use client";

import { useEffect, useState, useCallback } from "react";

type Pyodide = {
  runPython: (code: string) => void;
  runPythonAsync: (code: string) => Promise<any>;
  globals: any;
  loadedPackages: Set<string>;
};

let pyodideCache: Pyodide | null = null;
let loadPromise: Promise<Pyodide> | null = null;

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

    // @ts-ignore - Pyodide типы могут быть неполными
    const { loadPyodide: loadPyodideFn } = await import("pyodide");

    // Загружаем Pyodide с базовыми пакетами
    const pyodide = await loadPyodideFn({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/",
    });

    // Настраиваем перехват print() для получения вывода
    pyodide.runPython(`
import sys
from io import StringIO

class PyodideStdout:
    def __init__(self):
        self.buffer = StringIO()
    
    def write(self, s):
        if s:
            self.buffer.write(s)
    
    def flush(self):
        pass
    
    def getvalue(self):
        return self.buffer.getvalue()
    
    def reset(self):
        self.buffer = StringIO()

_stdout_capture = PyodideStdout()
sys.stdout = _stdout_capture
`);

    pyodideCache = pyodide;
    return pyodide;
  })();

  return loadPromise;
}

interface UsePyodideReturn {
  pyodide: Pyodide | null;
  loading: boolean;
  error: Error | null;
  executeCode: (code: string, timeout?: number) => Promise<{
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
      });
  }, []);

  const executeCode = useCallback(
    async (
      code: string,
      timeout: number = 10000
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
        // Сбрасываем буфер вывода
        pyodide.runPython("_stdout_capture.reset()");

        // Создаем промис для выполнения кода с timeout
        const executionPromise = pyodide.runPythonAsync(code);

        // Создаем промис для timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Превышено время выполнения (10 секунд)")),
            timeout
          );
        });

        // Ждем выполнения или timeout
        await Promise.race([executionPromise, timeoutPromise]);

        // Получаем вывод из stdout
        const output = pyodide.runPython("_stdout_capture.getvalue()") || "";
        const executionTime = Date.now() - startTime;

        return {
          output: String(output || "").trim(),
          error: null,
          executionTime,
        };
      } catch (err) {
        const executionTime = Date.now() - startTime;
        const errorMessage =
          err instanceof Error ? err.message : String(err);

        return {
          output: "",
          error: errorMessage,
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

