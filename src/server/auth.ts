import { cookies } from "next/headers";
import { CommerceError } from "@/domain/commerce";
import { isDemo } from "./config";
import { sessionDb, serviceDb } from "./supabase";
import { verifySession } from "./security";
export async function currentAdmin() {
  if (isDemo()) {
    const token = (await cookies()).get("vn-admin")?.value;
    return token ? verifySession(token) : null;
  }
  const db = await sessionDb();
  const { data, error } = await db.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const { data: admin } = await serviceDb()
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.claims.sub)
    .maybeSingle();
  return admin ? String(data.claims.email || data.claims.sub) : null;
}
export async function requireAdmin() {
  const email = await currentAdmin();
  if (!email) throw new CommerceError("Faça login como administrador.", 401);
  return email;
}
