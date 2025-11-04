"use client";

import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Layout } from "@/components/layout";
import { Navigation } from "@/components/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import React, { useEffect } from "react";

export function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Подавляем некритичные ошибки загрузки модулей Monaco Editor и расширений браузера
  useEffect(() => {
    const originalError = window.onerror;
    const originalUnhandledRejection = window.onunhandledrejection;

    window.onerror = (message, source, lineno, colno, error) => {
      // Игнорируем ошибки расширений браузера и вспомогательных модулей
      if (
        typeof message === "string" &&
        (message.includes("Extension context invalidated") ||
          message.includes("stackframe") ||
          message.includes("error-stack-parser") ||
          message.includes("intercept-console-error") ||
          message.includes("browser-polyfill") ||
          message.includes("Loading \"stackframe\" failed") ||
          message.includes("Loading \"error-stack-parser\" failed"))
      ) {
        return true; // Подавляем ошибку
      }
      // Игнорируем ошибки загрузки проблемных модулей по источнику
      if (
        typeof source === "string" &&
        (source.includes("stackframe") ||
          source.includes("error-stack-parser") ||
          source.includes("loader.js"))
      ) {
        return true;
      }
      if (originalError) {
        return originalError(message, source, lineno, colno, error);
      }
      return false;
    };

    window.onunhandledrejection = (event) => {
      // Игнорируем промисы с ошибками расширений браузера и модулей Monaco
      if (
        event.reason &&
        typeof event.reason === "object" &&
        "message" in event.reason &&
        typeof event.reason.message === "string" &&
        (event.reason.message.includes("Extension context invalidated") ||
          event.reason.message.includes("stackframe") ||
          event.reason.message.includes("error-stack-parser") ||
          event.reason.message.includes("browser-polyfill") ||
          event.reason.message.includes("Loading \"stackframe\" failed") ||
          event.reason.message.includes("Loading \"error-stack-parser\" failed"))
      ) {
        event.preventDefault();
        return;
      }
      // Игнорируем ошибки загрузки через Event объект
      if (event.reason && event.reason instanceof ErrorEvent) {
        const target = event.reason.target;
        if (target && "src" in target && typeof target.src === "string" && 
            (target.src.includes("stackframe") || target.src.includes("error-stack-parser"))) {
          event.preventDefault();
          return;
        }
      }
      // Игнорируем массивы с названиями модулей (например ["error-stack-parser"])
      if (Array.isArray(event.reason) && event.reason.length > 0 && 
          typeof event.reason[0] === "string" &&
          (event.reason[0].includes("error-stack-parser") || event.reason[0].includes("stackframe"))) {
        event.preventDefault();
        return;
      }
      if (originalUnhandledRejection) {
        originalUnhandledRejection(event);
      }
    };

    return () => {
      window.onerror = originalError;
      window.onunhandledrejection = originalUnhandledRejection;
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Layout>
          <Navigation />
          <main className="flex-1">{children}</main>
        </Layout>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
