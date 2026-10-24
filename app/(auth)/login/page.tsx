import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentAccount } from "@/lib/utils/auth";

export default async function LoginPage() {
  // Проверяем, авторизован ли пользователь
  const user = await getCurrentAccount();

  // Если пользователь уже авторизован, редиректим на модули
  if (user) {
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
