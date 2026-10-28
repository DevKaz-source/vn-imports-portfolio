import { cookies } from "next/headers";
import { endpoint } from "@/server/http";
import { assertOrigin } from "@/server/security";
import { isDemo } from "@/server/config";
import { sessionDb } from "@/server/supabase";
export const POST = endpoint(async (request) => {
  assertOrigin(request);
  if (isDemo()) (await cookies()).delete("vn-admin");
  else await (await sessionDb()).auth.signOut();
  return { ok: true };
});
