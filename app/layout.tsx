import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ClientLayout } from "./client-layout";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const themeScript = `(function(){try{var s=localStorage.getItem("codesensei-theme");var dark=s==="dark"||((!s||s==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.remove("light","dark");r.classList.add(dark?"dark":"light");}catch(e){}})();`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "CodeSensei",
  title: {
    default: "CodeSensei: тренажёр по Python для школьников 7–9 классов",
    template: "%s · CodeSensei",
  },
  description:
    "Интерактивный тренажёр по Python с геймификацией для школьников 7–9 классов: модули, задачи с автопроверкой, XP и достижения.",
  openGraph: {
    title: "CodeSensei: тренажёр по Python для школьников",
    description:
      "Пишите настоящий код с первого урока. Интерактивные модули, мгновенная проверка и XP за каждое решение.",
    type: "website",
    locale: "ru_RU",
    siteName: "CodeSensei",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CodeSensei: тренажёр по Python для школьников",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeSensei: тренажёр по Python для школьников",
    description: "Пишите настоящий код с первого урока.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The nonce of the current request: the Content Security Policy allows only
  // the scripts that carry it (see proxy.ts).
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Тема ставится до первой отрисовки, чтобы не было вспышки светлого фона (B7) */}
        <script
          nonce={nonce}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: статический инлайн-скрипт темы
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
