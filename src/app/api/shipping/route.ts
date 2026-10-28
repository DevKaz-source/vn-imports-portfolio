import { quoteSchema } from "@/domain/validation";
import { consolidate } from "@/domain/commerce";
import { buildQuote } from "@/integrations/shipping";
import { endpoint, readJson } from "@/server/http";
import { getState, saveQuote } from "@/server/repository";
import { assertOrigin, rateLimit } from "@/server/security";
export const POST = endpoint(async (request) => {
  assertOrigin(request);
  await rateLimit(request, "shipping", 20);
  const input = quoteSchema.parse(await readJson(request));
  const quote = await buildQuote(
    await getState(),
    consolidate(input.items),
    input.cep,
  );
  await saveQuote(quote);
  return quote;
});
