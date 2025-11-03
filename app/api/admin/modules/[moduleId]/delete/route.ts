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
    // 1) Удаляем tasks уроков модуля
    const { data: lessonIdsData, error: lessonsFetchError } = await supabase
      .from("lessons")
      .select("id")
      .eq("module_id", moduleId);

    if (lessonsFetchError) {
      return NextResponse.json({ error: lessonsFetchError.message }, { status: 400 });
    }

    const lessonIds = (lessonIdsData || []).map((l) => l.id);
    if (lessonIds.length > 0) {
      const { error: tasksDeleteError } = await supabase
        .from("tasks")
        .delete()
        .in("lesson_id", lessonIds);
      if (tasksDeleteError) {
        return NextResponse.json({ error: tasksDeleteError.message }, { status: 400 });
      }
    }

    // 2) Удаляем уроки модуля
    const { error: lessonsDeleteError } = await supabase
      .from("lessons")
      .delete()
      .eq("module_id", moduleId);
    if (lessonsDeleteError) {
      return NextResponse.json({ error: lessonsDeleteError.message }, { status: 400 });
    }

    // 3) Удаляем сам модуль
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


