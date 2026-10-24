import Link from "next/link";
import { AdminLayout } from "@/components/admin/admin-layout";
import { ModulesList } from "@/components/admin/modules-list";
import { Button } from "@/components/ui/button";
import { listAllModules } from "@/lib/appwrite/modules";
import { requireAdmin } from "@/lib/utils/auth";

export default async function AdminModulesPage() {
  await requireAdmin();
  const modules = await listAllModules();

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Управление модулями</h2>
        <Button asChild>
          <Link href="/admin/modules/new">Создать модуль</Link>
        </Button>
      </div>
      <ModulesList initialModules={modules} />
    </AdminLayout>
  );
}
