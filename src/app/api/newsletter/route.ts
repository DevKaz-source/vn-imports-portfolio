import { z } from "zod";
import { endpoint, readJson } from "@/server/http";
import { assertOrigin, rateLimit } from "@/server/security";
import { subscribe } from "@/server/repository";
export const POST = endpoint(async (request) => {
  assertOrigin(request);
  await rateLimit(request, "newsletter", 5, 300);
  const input = z
    .object({
      email: z
        .email()
        .max(160)
        .transform((v) => v.toLowerCase()),
      consent: z.literal(true),
    })
    .strict()
    .parse(await readJson(request));
  await subscribe(input.email);
  return { ok: true };
});
