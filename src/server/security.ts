import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { CommerceError } from "@/domain/commerce";
import { isDemo, siteUrl } from "./config";
import { serviceDb } from "./supabase";
export const hash = (input: string) =>
  createHash("sha256").update(input).digest("hex");
export function equal(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(siteUrl()).origin)
    throw new CommerceError("Origem da requisição não permitida.", 403);
}
export function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new CommerceError(
      "Execute a configuração inicial para habilitar o acesso administrativo.",
      503,
    );
  return secret;
}
export function signSession(email: string) {
  const data = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + 8 * 60 * 60 * 1000 }),
  ).toString("base64url");
  return `${data}.${createHmac("sha256", sessionSecret()).update(data).digest("hex")}`;
}
export function verifySession(token: string) {
  try {
    const [data, signature] = token.split(".");
    if (
      !data ||
      !signature ||
      !equal(
        signature,
        createHmac("sha256", sessionSecret()).update(data).digest("hex"),
      )
    )
      return null;
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString());
    return parsed.exp > Date.now() &&
      parsed.email === process.env.DEMO_ADMIN_EMAIL
      ? (parsed.email as string)
      : null;
  } catch {
    return null;
  }
}
const limits = new Map<string, { count: number; until: number }>();
export async function rateLimit(
  request: Request,
  scope: string,
  limit: number,
  seconds = 60,
) {
  const ip = process.env.VERCEL
    ? request.headers.get("x-real-ip") || "unknown"
    : request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const key = hash(`${scope}:${ip}`);
  if (isDemo()) {
    if (limits.size > 10000)
      for (const [k, v] of limits) if (v.until < Date.now()) limits.delete(k);
    const current = limits.get(key);
    if (!current || current.until < Date.now())
      limits.set(key, { count: 1, until: Date.now() + seconds * 1000 });
    else if (++current.count > limit)
      throw new CommerceError(
        "Muitas tentativas. Aguarde um pouco e tente novamente.",
        429,
      );
    return;
  }
  const { data, error } = await serviceDb().rpc("take_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window: seconds,
  });
  if (error)
    throw new CommerceError("Serviço temporariamente indisponível.", 503);
  if (!data)
    throw new CommerceError(
      "Muitas tentativas. Tente novamente em instantes.",
      429,
    );
}
export function verifyWebhookSignature(
  id: string,
  requestId: string,
  signature: string,
  secret: string,
  now = Date.now(),
) {
  const pieces = Object.fromEntries(
    signature.split(",").map((p) => p.trim().split("=")),
  );
  const ts = pieces.ts;
  const value = pieces.v1;
  if (
    !ts ||
    !value ||
    !/^\d+$/.test(ts) ||
    !secret ||
    !requestId ||
    !/^[a-zA-Z0-9]+$/.test(id)
  )
    return false;
  const time = ts.length > 10 ? Number(ts) : Number(ts) * 1000;
  if (Math.abs(now - time) > 10 * 60 * 1000) return false;
  const manifest = `id:${id.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  return equal(value, expected);
}
