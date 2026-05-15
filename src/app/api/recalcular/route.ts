import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recalcularTudo } from "@/lib/recalc";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_: NextRequest) {
  // Requer admin
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { data: perfil } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (perfil?.role !== "admin") return NextResponse.json({ error: "Apenas admin" }, { status: 403 });

  await recalcularTudo(createAdminClient());
  return NextResponse.json({ ok: true });
}
