import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/auth";

type Body = {
  title: string;
  topic: string;
  description: string | null;
  level: number;
  order_index: number;
  is_published: boolean;
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`update module timeout after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(id); resolve(v); }).catch((e) => { clearTimeout(id); reject(e); });
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    await requireAdmin();
    const { moduleId } = await params;
    const supabase = await createClient();

    const body = (await request.json()) as Body;
    const desc = body.description || "";
    const stats = {
      len: desc.length,
      nonAscii: (desc.match(/[^\x00-\x7F]/g) || []).length,
      sample: desc.slice(0, 150),
      title: body.title,
      topic: body.topic,
      moduleId,
    };
    console.log("API:updateModule: payload stats", stats);

    const updatePromise = supabase
      .from("modules")
      .update({
        title: body.title,
        topic: body.topic,
        description: body.description,
        level: body.level,
        order_index: body.order_index,
        is_published: body.is_published,
      })
      .eq("id", moduleId);

    const { error } = await withTimeout(updatePromise, 15000);

    if (error) {
      console.error("API:updateModule: update error", error);
      return NextResponse.json({ error: error.message, code: (error as any)?.code }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("API:updateModule: unexpected", e);
    const msg = e?.message || "Unknown error";
    const status = /timeout/i.test(msg) ? 504 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}


