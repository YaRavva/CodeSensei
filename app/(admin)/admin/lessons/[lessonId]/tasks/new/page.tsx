import { AdminLayout } from "@/components/admin/admin-layout";
import { TaskForm } from "@/components/admin/task-form";
import { requireAdmin } from "@/lib/utils/auth";

export default async function NewTaskPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  await requireAdmin();
  const { lessonId } = await params;

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold mb-6">Создать задание</h2>
      <TaskForm lessonId={lessonId} />
    </AdminLayout>
  );
}
