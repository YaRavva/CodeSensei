import { AdminLayout } from "@/components/admin/admin-layout";
import { ModuleForm } from "@/components/admin/module-form";
import { requireAdmin } from "@/lib/utils/auth";

export default async function NewModulePage() {
  await requireAdmin();

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold mb-6">Создать модуль</h2>
      <ModuleForm />
    </AdminLayout>
  );
}
