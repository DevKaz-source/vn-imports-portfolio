import { endpoint, readJson } from "@/server/http";
import { assertOrigin, rateLimit } from "@/server/security";
import { checkout } from "@/server/checkout";
export const POST = endpoint(async (request) => {
  assertOrigin(request);
  await rateLimit(request, "checkout", 8);
  return checkout(await readJson(request));
});
