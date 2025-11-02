import { AdminLayout } from "@/components/admin/admin-layout";
import { ModulesList } from "@/components/admin/modules-list";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/utils/auth";
import Link from "next/link";

export default async function AdminModulesPage() {
  await requireAdmin();

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Управление модулями</h2>
        <Button asChild>
          <Link href="/admin/modules/new">Создать модуль</Link>
        </Button>
      </div>
      <ModulesList />
    </AdminLayout>
  );
}
