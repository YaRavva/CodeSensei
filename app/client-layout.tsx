"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { Layout } from "@/components/layout";
import { Navigation } from "@/components/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import React from "react";

export function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
