import { AdminLayout } from "@/components/admin/admin-layout";
import { LessonForm } from "@/components/admin/lesson-form";
import { requireAdmin } from "@/lib/utils/auth";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  await requireAdmin();
  const { lessonId } = await params;

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold mb-6">Редактировать урок</h2>
      <LessonForm lessonId={lessonId} />
    </AdminLayout>
  );
}
