import type { Metadata } from "next";
import "./globals.css";
import { ClientLayout } from "./client-layout";

export const metadata: Metadata = {
  title: "CodeSensei - Python Тренажер для Школьников",
  description: "Интерактивный Python-тренажер с геймификацией для школьников 7-9 классов",
  metadataBase: new URL("https://codesensei.example"),
  openGraph: {
    title: "CodeSensei - Python Тренажер для Школьников",
    description:
      "Пишите настоящий код с первого урока. Интерактивные модули, мгновенная проверка и XP за каждое решение.",
    type: "website",
    locale: "ru_RU",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CodeSensei - Python для школьников",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeSensei - Python Тренажер для Школьников",
    description: "Пишите настоящий код с первого урока.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
