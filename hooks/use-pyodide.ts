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
    // Динамический импорт Pyodide (только на клиенте)
    if (typeof window === "undefined") {
      throw new Error("Pyodide может быть загружен только на клиенте");
    }

    try {
      // Проверяем, загружен ли уже Pyodide
      if (typeof window.loadPyodide === 'function') {
        // @ts-ignore
        const pyodideInstance = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/",
        });

        // Настраиваем перехват print() для получения вывода
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
      }

      // Загружаем Pyodide напрямую с CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
      script.async = true;
      script.setAttribute('data-pyodide-base-url', 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'); // Добавляем этот атрибут
      
      const loadPromise = new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide script'));
      });
      
      document.head.appendChild(script);
      await loadPromise;
      
      // Теперь получаем доступ к глобальному объекту loadPyodide
      // @ts-ignore
      const pyodideInstance = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/",
      });

      // Настраиваем перехват print() для получения вывода
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
          const lines = errorMessage.split('\n');
          const errorLine = lines[lines.length - 1] || errorMessage;
          
          // Проверяем, есть ли traceback в сообщении
          const hasTraceback = errorMessage.includes('Traceback');
          
          if (hasTraceback || errorLine.trim()) {
            
            // Упрощаем сообщение, убирая технические детали
            if (errorLine.includes('UnboundLocalError')) {
              const match = errorLine.match(/UnboundLocalError: (.+)/);
              errorMessage = match ? `Ошибка: ${match[1]}` : errorLine;
            } else if (errorLine.includes('NameError')) {
              const match = errorLine.match(/NameError: (.+)/);
              errorMessage = match ? `Ошибка: ${match[1]}` : errorLine;
            } else if (errorLine.includes('SyntaxError')) {
              const match = errorLine.match(/SyntaxError: (.+)/);
              errorMessage = match ? `Синтаксическая ошибка: ${match[1]}` : errorLine;
            } else if (errorLine.includes('TypeError')) {
              const match = errorLine.match(/TypeError: (.+)/);
              errorMessage = match ? `Ошибка типа: ${match[1]}` : errorLine;
            } else if (errorLine.includes('IndentationError')) {
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