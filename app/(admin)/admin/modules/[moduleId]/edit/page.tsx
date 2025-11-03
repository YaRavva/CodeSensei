import { AdminLayout } from "@/components/admin/admin-layout";
import { ModuleForm } from "@/components/admin/module-form";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/auth";

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  await requireAdmin();
  const { moduleId } = await params;

  // Загружаем модуль на сервере и передаём в форму, чтобы поля были заполнены сразу
  const supabase = await createClient();
  const { data: initialModule } = await supabase
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .maybeSingle();

  return (
    <AdminLayout>
      <h2 className="text-2xl font-bold mb-6">Редактировать модуль</h2>
      <ModuleForm moduleId={moduleId} initialData={initialModule ?? undefined} />
    </AdminLayout>
  );
}
