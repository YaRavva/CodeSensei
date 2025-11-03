import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    await requireAdmin();
    const { moduleId } = await params;
    const supabase = await createClient();

    // Удаляем зависимости вручную, если нет ON DELETE CASCADE
    // 1) Удаляем tasks модуля
    const { error: tasksDeleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("module_id", moduleId); // Изменено: удаляем задачи по module_id
    if (tasksDeleteError) {
      return NextResponse.json({ error: tasksDeleteError.message }, { status: 400 });
    }

    // 2) Удаляем сам модуль
    const { error: moduleDeleteError } = await supabase
      .from("modules")
      .delete()
      .eq("id", moduleId);
    if (moduleDeleteError) {
      return NextResponse.json({ error: moduleDeleteError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}


