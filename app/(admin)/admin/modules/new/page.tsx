import { AdminLayout } from "@/components/admin/admin-layout";
import { ModuleForm } from "@/components/admin/module-form";
import { requireAdmin } from "@/lib/utils/auth";

export default async function NewModulePage() {
  const { user } = await requireAdmin();

  return (
    <AdminLayout>
      <ModuleForm createdByUserId={user.id} />
    </AdminLayout>
  );
}
