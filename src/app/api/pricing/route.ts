import { z } from "zod";
import { cartSchema } from "@/domain/validation";
import {
  calculateTotals,
  CommerceError,
  resolveLines,
} from "@/domain/commerce";
import { endpoint, readJson } from "@/server/http";
import { getState, getQuote } from "@/server/repository";
import { assertOrigin, rateLimit } from "@/server/security";
import { cartHash } from "@/integrations/shipping";
const schema = z
  .object({
    items: cartSchema,
    coupon: z.string().max(40).default(""),
    method: z.enum(["pix", "card"]),
    email: z.string().max(160).default(""),
    quoteId: z.uuid().optional(),
    shippingId: z.string().max(50).optional(),
  })
  .strict();
export const POST = endpoint(async (request) => {
  assertOrigin(request);
  await rateLimit(request, "pricing", 60);
  const input = schema.parse(await readJson(request));
  const state = await getState();
  const lines = resolveLines(state.products, input.items, state.settings);
  const coupon = input.coupon
    ? state.coupons.find((c) => c.code === input.coupon.trim().toUpperCase())
    : undefined;
  if (input.coupon && !coupon) throw new CommerceError("Cupom não encontrado.");
  let shipping = 0;
  if (input.quoteId && input.shippingId) {
    const quote = await getQuote(input.quoteId);
    if (
      !quote ||
      quote.cartHash !== cartHash(input.items) ||
      Date.parse(quote.expiresAt) < Date.now()
    )
      throw new CommerceError("Recalcule o frete.");
    const option = quote.options.find((o) => o.id === input.shippingId);
    if (!option) throw new CommerceError("Frete indisponível.");
    shipping = option.priceCents;
  }
  return {
    ...calculateTotals(
      lines,
      shipping,
      input.method,
      coupon,
      state.orders,
      input.email,
    ),
    couponCode: coupon?.code || "",
  };
});
