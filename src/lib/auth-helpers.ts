import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase
    .from("users")
    .select("id, nome, email, telefone, role, pago")
    .eq("id", user.id)
    .single();
  return perfil ?? null;
}

export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (u.role !== "admin") redirect("/");
  return u;
}
