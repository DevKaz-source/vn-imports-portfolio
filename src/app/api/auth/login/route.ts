import { z } from "zod";
import { cookies } from "next/headers";
import { CommerceError } from "@/domain/commerce";
import { endpoint, readJson } from "@/server/http";
import { isDemo } from "@/server/config";
import {
  assertOrigin,
  equal,
  hash,
  rateLimit,
  signSession,
} from "@/server/security";
import { sessionDb, serviceDb } from "@/server/supabase";
export const POST = endpoint(async (request) => {
  assertOrigin(request);
  await rateLimit(request, "admin-login", 5, 900);
  const input = z
    .object({ email: z.email().max(160), password: z.string().min(1).max(200) })
    .strict()
    .parse(await readJson(request));
  if (isDemo()) {
    if (!process.env.DEMO_ADMIN_PASSWORD || !process.env.DEMO_ADMIN_EMAIL)
      throw new CommerceError(
        "Execute npm run setup no projeto para criar seu acesso local.",
        503,
      );
    if (
      !equal(hash(input.password), hash(process.env.DEMO_ADMIN_PASSWORD)) ||
      input.email !== process.env.DEMO_ADMIN_EMAIL
    )
      throw new CommerceError("E-mail ou senha incorretos.", 401);
    (await cookies()).set("vn-admin", signSession(input.email), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return { ok: true };
  }
  const db = await sessionDb();
  const { data, error } = await db.auth.signInWithPassword(input);
  if (error || !data.user)
    throw new CommerceError("E-mail ou senha incorretos.", 401);
  const { data: admin } = await serviceDb()
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!admin) {
    await db.auth.signOut();
    throw new CommerceError("Acesso restrito ao administrador.", 403);
  }
  return { ok: true };
});
