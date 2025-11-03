import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/modules");
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold tracking-tight">Добро пожаловать в CodeSensei</h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Интерактивный Python-тренажер с геймификацией для школьников 7-9 классов
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/login">Войти</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/register">Регистрация</Link>
          </Button>
        </div>
        <div className="pt-8">
          <Button asChild variant="ghost">
            <Link href="/test-pyodide">Тестировать Pyodide</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}