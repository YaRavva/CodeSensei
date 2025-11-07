import { LoginForm } from "@/components/login-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const supabase = await createClient();
  
  // Проверяем, авторизован ли пользователь
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Если пользователь уже авторизован, редиректим на модули
  if (session?.user) {
    redirect("/modules");
  }

  return (
    <div className="bg-background flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm />
      </div>
    </div>
  );
}
