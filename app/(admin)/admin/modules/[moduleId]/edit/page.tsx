import { AdminLayout } from "@/components/admin/admin-layout";
import { ModuleForm } from "@/components/admin/module-form";
import { getModule } from "@/lib/appwrite/modules";
import { requireAdmin } from "@/lib/utils/auth";

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  await requireAdmin();
  const { moduleId } = await params;

  const initialModule = await getModule(moduleId);

  return (
    <AdminLayout>
      <ModuleForm moduleId={moduleId} initialData={initialModule ?? undefined} />
    </AdminLayout>
  );
}
