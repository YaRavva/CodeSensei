import { AdminLayout } from "@/components/admin/admin-layout";
import { LessonsList } from "@/components/admin/lessons-list";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/auth";
import Link from "next/link";

export default async function AdminLessonsPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  await requireAdmin();
  const { moduleId } = await params;
  const supabase = await createClient();

  const { data: module } = await supabase
    .from("modules")
    .select("title")
    .eq("id", moduleId)
    .single();

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Уроки модуля</h2>
          {module && <p className="text-muted-foreground">{module.title}</p>}
        </div>
        <Button asChild>
          <Link href={`/admin/modules/${moduleId}/lessons/new`}>Создать урок</Link>
        </Button>
      </div>
      <LessonsList moduleId={moduleId} />
    </AdminLayout>
  );
}
