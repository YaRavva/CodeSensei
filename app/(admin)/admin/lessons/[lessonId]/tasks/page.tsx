import { AdminLayout } from "@/components/admin/admin-layout";
import { TasksList } from "@/components/admin/tasks-list";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/auth";
import Link from "next/link";

export default async function AdminTasksPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  await requireAdmin();
  const { lessonId } = await params;
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("title")
    .eq("id", lessonId)
    .single();

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Задания урока</h2>
          {lesson && <p className="text-muted-foreground">{lesson.title}</p>}
        </div>
        <Button asChild>
          <Link href={`/admin/lessons/${lessonId}/tasks/new`}>Создать задание</Link>
        </Button>
      </div>
      <TasksList lessonId={lessonId} />
    </AdminLayout>
  );
}
