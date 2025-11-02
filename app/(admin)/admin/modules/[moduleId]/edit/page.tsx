import { AdminLayout } from "@/components/admin/admin-layout";
import { ModuleForm } from "@/components/admin/module-form";
import { requireAdmin } from "@/lib/utils/auth";

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  await requireAdmin();
  const { moduleId } = await params;

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold mb-6">Редактировать модуль</h2>
      <ModuleForm moduleId={moduleId} />
    </AdminLayout>
  );
}
