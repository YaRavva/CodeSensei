import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  
  // Используем getSession для более надежной проверки сессии
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // Если есть ошибка или сессия не найдена, редиректим на логин
  if (error || !session || !session.user) {
    redirect("/login");
  }

  // Если сессия валидна, редиректим на модули
  redirect("/modules");
}