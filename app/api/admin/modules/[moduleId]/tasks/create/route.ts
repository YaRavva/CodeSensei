export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export async function POST(req: NextRequest, { params }: { params: Promise<{ moduleId: string }> }) {
  try {
    const { moduleId: moduleIdParam } = await params;
    const moduleId = decodeURIComponent(moduleIdParam || "");
    if (!moduleId) return NextResponse.json({ error: "moduleId is required" }, { status: 400 });

    // 1) Authn + role check (admin/teacher)
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: userRole, error: roleError } = await (supabase.rpc as any)("get_user_role", { user_id: user.id });
    const role = typeof userRole === "string" ? userRole : String(userRole ?? "");
    if (roleError || (role !== "admin" && role !== "teacher")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2) Read body
    const body = await req.json();
    const {
      title,
      description,
      starter_code,
      solution_code,
      test_cases,
      difficulty,
      xp_reward,
      order_index,
    } = body || {};

    if (!title || !description || !starter_code || !Array.isArray(test_cases)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // 3) Ensure module exists
    const serviceKeyProbe = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    if (!serviceKeyProbe) return NextResponse.json({ error: "Service key not configured (set SUPABASE_SERVICE_KEY)" }, { status: 500 });
    const adminProbe = createServiceClient<Database>(url, serviceKeyProbe, { auth: { persistSession: false } });
    const { data: moduleRow, error: moduleErr } = await adminProbe.from("modules").select("id").eq("id", moduleId).maybeSingle();
    if (moduleErr) return NextResponse.json({ error: moduleErr.message }, { status: 400 });
    if (!moduleRow) return NextResponse.json({ error: "Module not found for module_id" }, { status: 404 });

    // 4) Insert via service role (bypass RLS safely after role check)
    const serviceKey = serviceKeyProbe;
    const admin = createServiceClient<Database>(url, serviceKey, { auth: { persistSession: false } });

    const { data, error } = await admin
      .from("tasks")
      .insert({
        title,
        description,
        starter_code,
        solution_code: solution_code ?? null,
        test_cases,
        difficulty,
        xp_reward: typeof xp_reward === "number" ? xp_reward : null,
        order_index: typeof order_index === "number" ? order_index : 0,
        module_id: moduleId,
      } as any)
      .select("id")
      .single();

    if (error) {
      const details = (error as any)?.details || (error as any)?.hint || null;
      const code = (error as any)?.code || (error as any)?.status || 400;
      return NextResponse.json({ error: error.message, details, moduleId }, { status: 400 });
    }

    return NextResponse.json({ id: (data as any)?.id }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


