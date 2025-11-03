"use client";

import { useEffect, useState, useCallback } from "react";

// Более точные типы для Pyodide
interface Pyodide {
  runPython: (code: string) => any;
  runPythonAsync: (code: string) => Promise<any>;
  globals: any;
  loadedPackages: { [key: string]: string } | Set<string>;
}

let pyodideCache: Pyodide | null = null;
let loadPromise: Promise<Pyodide> | null = null;

declare global {
  interface Window {
    loadPyodide: any;
  }
}

async function loadPyodide(): Promise<Pyodide> {
  if (pyodideCache) {
    return pyodideCache;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    if (typeof window === "undefined") {
      throw new Error("Pyodide может быть загружен только на клиенте");
    }

    try {
      if (typeof window.loadPyodide !== 'function') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
        script.async = true;
        
        const scriptLoadPromise = new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Pyodide script'));
        });
        
        document.head.appendChild(script);
        await scriptLoadPromise;
      }
      
      const pyodideInstance = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/",
      });

      pyodideInstance.runPython(`
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

      pyodideCache = pyodideInstance;
      return pyodideInstance;
    } catch (error) {
      console.error("Error loading Pyodide:", error);
      throw new Error(`Failed to load Pyodide: ${error instanceof Error ? error.message : String(error)}`);
    }
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
        console.error("Pyodide loading failed:", err);
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
        const outputResult = pyodide.runPython("_stdout_capture.getvalue()");
        const output = outputResult !== null && outputResult !== undefined ? String(outputResult) : "";
        const executionTime = Date.now() - startTime;

        return {
          output: output.trim(),
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