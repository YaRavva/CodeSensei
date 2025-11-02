import { AdminLayout } from "@/components/admin/admin-layout";
import { TaskForm } from "@/components/admin/task-form";
import { requireAdmin } from "@/lib/utils/auth";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  await requireAdmin();
  const { taskId } = await params;

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold mb-6">Редактировать задание</h2>
      <TaskForm taskId={taskId} />
    </AdminLayout>
  );
}
