import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/landing-page";
import { getCurrentAccount } from "@/lib/utils/auth";

export const metadata: Metadata = {
  title: "CodeSensei: тренажёр по Python для школьников 7–9 классов",
  description:
    "Интерактивные модули по Python с мгновенной проверкой кода и XP за каждое решение. Первый рабочий скрипт уже на первом уроке, без установки программ.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "CodeSensei: тренажёр по Python для школьников",
    description:
      "Пишите настоящий код с первого урока. Интерактивные модули, мгновенная проверка и XP за каждое решение.",
    url: "/",
    siteName: "CodeSensei",
    locale: "ru_RU",
    type: "website",
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
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Что нужно, чтобы начать заниматься?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Только браузер и аккаунт. Всё выполняется онлайн, устанавливать ничего не нужно.",
      },
    },
    {
      "@type": "Question",
      name: "Для какого возраста подходит тренажёр?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Курс рассчитан на школьников 7–9 классов, но формат подходит и начинающим постарше.",
      },
    },
    {
      "@type": "Question",
      name: "Это бесплатно?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Да, заниматься можно бесплатно, в своём темпе. Подписок и платных курсов нет.",
      },
    },
    {
      "@type": "Question",
      name: "С чего начинается обучение?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "С первого модуля по основам Python. Дальше сложность растёт плавно, каждая тема опирается на пройденную.",
      },
    },
  ],
};

export default async function Home() {
  const user = await getCurrentAccount();

  // Авторизованным показываем каталог модулей
  if (user) {
    redirect("/modules");
  }

  // Анонимному посетителю — продуктовый лендинг с CTA на регистрацию
  return (
    <>
      <LandingPage />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: статический JSON-LD для поиска
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
