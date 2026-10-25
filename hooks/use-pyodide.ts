"use client";

import { useCallback, useEffect, useState } from "react";

// Р‘РѕР»РµРµ С‚РѕС‡РЅС‹Рµ С‚РёРїС‹ РґР»СЏ Pyodide
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
    // Р”РёРЅР°РјРёС‡РµСЃРєРёР№ РёРјРїРѕСЂС‚ Pyodide (С‚РѕР»СЊРєРѕ РЅР° РєР»РёРµРЅС‚Рµ)
    if (typeof window === "undefined") {
      throw new Error(
        "Pyodide РјРѕР¶РµС‚ Р±С‹С‚СЊ Р·Р°РіСЂСѓР¶РµРЅ С‚РѕР»СЊРєРѕ РЅР° РєР»РёРµРЅС‚Рµ"
      );
    }

    try {
      // РџСЂРѕРІРµСЂСЏРµРј, Р·Р°РіСЂСѓР¶РµРЅ Р»Рё СѓР¶Рµ Pyodide
      if (typeof window.loadPyodide === "function") {
        const pyodideInstance = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/",
        });

        // РќР°СЃС‚СЂР°РёРІР°РµРј РїРµСЂРµС…РІР°С‚ print() РґР»СЏ РїРѕР»СѓС‡РµРЅРёСЏ РІС‹РІРѕРґР°
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

      // Р—Р°РіСЂСѓР¶Р°РµРј Pyodide РЅР°РїСЂСЏРјСѓСЋ СЃ CDN
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.js";
      script.async = true;
      script.setAttribute(
        "data-pyodide-base-url",
        "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/"
      ); // Р”РѕР±Р°РІР»СЏРµРј СЌС‚РѕС‚ Р°С‚СЂРёР±СѓС‚

      const loadPromise = new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Pyodide script"));
      });

      document.head.appendChild(script);
      await loadPromise;

      // РўРµРїРµСЂСЊ РїРѕР»СѓС‡Р°РµРј РґРѕСЃС‚СѓРї Рє РіР»РѕР±Р°Р»СЊРЅРѕРјСѓ РѕР±СЉРµРєС‚Сѓ loadPyodide
      const pyodideInstance = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/",
      });

      // РќР°СЃС‚СЂР°РёРІР°РµРј РїРµСЂРµС…РІР°С‚ print() РґР»СЏ РїРѕР»СѓС‡РµРЅРёСЏ РІС‹РІРѕРґР°
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
    timeout?: number
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
      timeout: number = 10000
    ): Promise<{
      output: string;
      error: string | null;
      executionTime: number;
    }> => {
      if (!pyodide) {
        throw new Error("Pyodide РЅРµ Р·Р°РіСЂСѓР¶РµРЅ");
      }

      const startTime = Date.now();

      try {
        // РЎР±СЂР°СЃС‹РІР°РµРј Р±СѓС„РµСЂ РІС‹РІРѕРґР° Рё РѕС‡РёС‰Р°РµРј РїСЂРµРґС‹РґСѓС‰РёРµ РѕС€РёР±РєРё
        try {
          pyodide.runPython("_stdout_capture.reset()");
        } catch {
          // РРіРЅРѕСЂРёСЂСѓРµРј РѕС€РёР±РєРё РїСЂРё СЃР±СЂРѕСЃРµ Р±СѓС„РµСЂР°
        }

        // РћС‡РёС‰Р°РµРј РІРѕР·РјРѕР¶РЅС‹Рµ РѕСЃС‚Р°С‚РѕС‡РЅС‹Рµ РїРµСЂРµРјРµРЅРЅС‹Рµ РёР· РїСЂРµРґС‹РґСѓС‰РёС… РІС‹РїРѕР»РЅРµРЅРёР№
        try {
          pyodide.runPython(`
try:
    # РћС‡РёС‰Р°РµРј С‚РµСЃС‚РѕРІС‹Рµ РїРµСЂРµРјРµРЅРЅС‹Рµ, РµСЃР»Рё РѕРЅРё РѕСЃС‚Р°Р»РёСЃСЊ
    del _test_result, _test_passed, _test_error, _test_expected, _test_compare
except:
    pass
`);
        } catch {
          // РРіРЅРѕСЂРёСЂСѓРµРј РѕС€РёР±РєРё РїСЂРё РѕС‡РёСЃС‚РєРµ
        }

        // РЎРѕР·РґР°РµРј РїСЂРѕРјРёСЃ РґР»СЏ РІС‹РїРѕР»РЅРµРЅРёСЏ РєРѕРґР° СЃ timeout
        const executionPromise = pyodide.runPythonAsync(code);

        // РЎРѕР·РґР°РµРј РїСЂРѕРјРёСЃ РґР»СЏ timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error("РџСЂРµРІС‹С€РµРЅРѕ РІСЂРµРјСЏ РІС‹РїРѕР»РЅРµРЅРёСЏ (10 СЃРµРєСѓРЅРґ)")
              ),
            timeout
          );
        });

        // Р–РґРµРј РІС‹РїРѕР»РЅРµРЅРёСЏ РёР»Рё timeout
        await Promise.race([executionPromise, timeoutPromise]);

        // РџРѕР»СѓС‡Р°РµРј РІС‹РІРѕРґ РёР· stdout
        let output = "";
        try {
          const outputResult = pyodide.runPython("_stdout_capture.getvalue()");
          output = outputResult !== null && outputResult !== undefined ? String(outputResult) : "";
        } catch {
          // Р•СЃР»Рё РЅРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ РІС‹РІРѕРґ, РѕСЃС‚Р°РІР»СЏРµРј РїСѓСЃС‚С‹Рј
        }

        const executionTime = Date.now() - startTime;

        return {
          output: output.trim(),
          error: null,
          executionTime,
        };
      } catch (err) {
        const executionTime = Date.now() - startTime;

        // РЈР»СѓС‡С€РµРЅРЅР°СЏ РѕР±СЂР°Р±РѕС‚РєР° РѕС€РёР±РѕРє Python
        let errorMessage = "";

        if (err instanceof Error) {
          errorMessage = err.message;

          // РР·РІР»РµРєР°РµРј Р±РѕР»РµРµ РїРѕРЅСЏС‚РЅРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ РёР· traceback Python
          // Pyodide РѕР±С‹С‡РЅРѕ РІРєР»СЋС‡Р°РµС‚ traceback РІ СЃРѕРѕР±С‰РµРЅРёРµ РѕР± РѕС€РёР±РєРµ
          // РР·РІР»РµРєР°РµРј РїРѕСЃР»РµРґРЅСЋСЋ СЃС‚СЂРѕРєСѓ СЃ С‚РёРїРѕРј РѕС€РёР±РєРё Рё СЃРѕРѕР±С‰РµРЅРёРµРј
          const lines = errorMessage.split("\n");
          const errorLine = lines[lines.length - 1] || errorMessage;

          // РџСЂРѕРІРµСЂСЏРµРј, РµСЃС‚СЊ Р»Рё traceback РІ СЃРѕРѕР±С‰РµРЅРёРё
          const hasTraceback = errorMessage.includes("Traceback");

          if (hasTraceback || errorLine.trim()) {
            // РЈРїСЂРѕС‰Р°РµРј СЃРѕРѕР±С‰РµРЅРёРµ, СѓР±РёСЂР°СЏ С‚РµС…РЅРёС‡РµСЃРєРёРµ РґРµС‚Р°Р»Рё
            if (errorLine.includes("UnboundLocalError")) {
              const match = errorLine.match(/UnboundLocalError: (.+)/);
              errorMessage = match ? `РћС€РёР±РєР°: ${match[1]}` : errorLine;
            } else if (errorLine.includes("NameError")) {
              const match = errorLine.match(/NameError: (.+)/);
              errorMessage = match ? `РћС€РёР±РєР°: ${match[1]}` : errorLine;
            } else if (errorLine.includes("SyntaxError")) {
              const match = errorLine.match(/SyntaxError: (.+)/);
              errorMessage = match
                ? `РЎРёРЅС‚Р°РєСЃРёС‡РµСЃРєР°СЏ РѕС€РёР±РєР°: ${match[1]}`
                : errorLine;
            } else if (errorLine.includes("TypeError")) {
              const match = errorLine.match(/TypeError: (.+)/);
              errorMessage = match ? `РћС€РёР±РєР° С‚РёРїР°: ${match[1]}` : errorLine;
            } else if (errorLine.includes("IndentationError")) {
              const match = errorLine.match(/IndentationError: (.+)/);
              errorMessage = match ? `РћС€РёР±РєР° РѕС‚СЃС‚СѓРїРѕРІ: ${match[1]}` : errorLine;
            } else {
              // Р‘РµСЂРµРј РїРѕСЃР»РµРґРЅСЋСЋ СЃС‚СЂРѕРєСѓ traceback РєР°Рє РѕСЃРЅРѕРІРЅРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ
              errorMessage = errorLine.trim();
            }
          } else {
            // Р•СЃР»Рё РЅРµС‚ traceback, РёСЃРїРѕР»СЊР·СѓРµРј РёСЃС…РѕРґРЅРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ
            errorMessage = errorLine.trim() || errorMessage;
          }
        } else {
          errorMessage = String(err);
        }

        // РћС‡РёС‰Р°РµРј СЃРѕСЃС‚РѕСЏРЅРёРµ Pyodide РїРѕСЃР»Рµ РѕС€РёР±РєРё, С‡С‚РѕР±С‹ РЅРµ Р±Р»РѕРєРёСЂРѕРІР°С‚СЊ СЃР»РµРґСѓСЋС‰РёРµ РІС‹РїРѕР»РЅРµРЅРёСЏ
        try {
          // РџС‹С‚Р°РµРјСЃСЏ РѕС‡РёСЃС‚РёС‚СЊ РІРѕР·РјРѕР¶РЅС‹Рµ РіР»РѕР±Р°Р»СЊРЅС‹Рµ РїРµСЂРµРјРµРЅРЅС‹Рµ, РєРѕС‚РѕСЂС‹Рµ РјРѕРіР»Рё РѕСЃС‚Р°С‚СЊСЃСЏ
          pyodide.runPython(`
try:
    del _test_result, _test_passed, _test_error, _test_expected
except:
    pass
`);
        } catch {
          // РРіРЅРѕСЂРёСЂСѓРµРј РѕС€РёР±РєРё РїСЂРё РѕС‡РёСЃС‚РєРµ
        }

        return {
          output: "",
          error:
            errorMessage || "РџСЂРѕРёР·РѕС€Р»Р° РѕС€РёР±РєР° РїСЂРё РІС‹РїРѕР»РЅРµРЅРёРё РєРѕРґР°",
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
