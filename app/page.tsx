import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/landing-page";
import { getCurrentAccount } from "@/lib/utils/auth";

export default async function Home() {
  const user = await getCurrentAccount();

  // Авторизованным показываем каталог модулей
  if (user) {
    redirect("/modules");
  }

  // Анонимному посетителю — продуктовый лендинг с CTA на регистрацию
  return <LandingPage />;
}
