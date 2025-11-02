import { AdminLayout } from "@/components/admin/admin-layout";
import { LessonForm } from "@/components/admin/lesson-form";
import { requireAdmin } from "@/lib/utils/auth";

export default async function NewLessonPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  await requireAdmin();
  const { moduleId } = await params;

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold mb-6">Создать урок</h2>
      <LessonForm moduleId={moduleId} />
    </AdminLayout>
  );
}
