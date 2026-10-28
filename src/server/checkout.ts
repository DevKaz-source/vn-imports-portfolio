import { randomUUID } from "node:crypto";
import { checkoutSchema } from "@/domain/validation";
import {
  calculateTotals,
  CommerceError,
  consolidate,
  resolveLines,
} from "@/domain/commerce";
import { cartHash } from "@/integrations/shipping";
import { startPayment } from "@/integrations/payments";
import {
  getState,
  getQuote,
  getOrderByKey,
  reserveOrder,
  publicOrder,
} from "./repository";
import { isDemo } from "./config";
import { equal, hash } from "./security";
export async function checkout(payload: unknown) {
  const input = checkoutSchema.parse(payload);
  const items = consolidate(input.items);
  const { accessToken, card, ...request } = input;
  const requestHash = hash(JSON.stringify({ ...request, items }));
  const accessHash = hash(accessToken);
  const old = await getOrderByKey(input.idempotencyKey);
  if (old) {
    if (!equal(old.accessHash, accessHash) || old.requestHash !== requestHash)
      throw new CommerceError("Chave de compra já utilizada.", 409);
    return publicOrder(old);
  }
  const state = await getState();
  if (!isDemo()) {
    if (
      process.env.CHECKOUT_ENABLED !== "true" ||
      !state.settings.businessName ||
      !state.settings.businessDocument ||
      !state.settings.businessAddress ||
      !state.settings.email ||
      !state.settings.policiesReviewed ||
      !process.env.MERCADOPAGO_ACCESS_TOKEN ||
      !process.env.MERCADOPAGO_WEBHOOK_SECRET
    )
      throw new CommerceError(
        "A loja está preparando a abertura das vendas. Fale com a VN no Instagram.",
        503,
      );
    if (
      items.some((l) => state.products.find((p) => p.id === l.productId)?.demo)
    )
      throw new CommerceError(
        "Peças de demonstração não podem ser compradas com dinheiro real.",
        422,
      );
    if (input.method === "card" && !card)
      throw new CommerceError("Preencha o formulário seguro do cartão.");
  }
  const lines = resolveLines(state.products, items, state.settings);
  const quote = await getQuote(input.quoteId);
  if (
    !quote ||
    quote.cep !== input.address.cep ||
    quote.cartHash !== cartHash(items) ||
    Date.parse(quote.expiresAt) < Date.now()
  )
    throw new CommerceError(
      "O frete expirou ou a sacola mudou. Calcule novamente.",
      409,
    );
  const shipping = quote.options.find((o) => o.id === input.shippingId);
  if (!shipping) throw new CommerceError("Escolha uma modalidade de entrega.");
  if (!isDemo() && shipping.demo)
    throw new CommerceError(
      "O frete está em sandbox. Configure Melhor Envio em produção antes de cobrar.",
      503,
    );
  const coupon = input.coupon
    ? state.coupons.find((c) => c.code === input.coupon.toUpperCase())
    : undefined;
  if (input.coupon && !coupon) throw new CommerceError("Cupom não encontrado.");
  const totals = calculateTotals(
    lines,
    shipping.priceCents,
    input.method,
    coupon,
    state.orders,
    input.customer.email,
  );
  if (totals.totalCents < 100)
    throw new CommerceError("O total mínimo do pedido é R$ 1,00.");
  const now = new Date().toISOString();
  const id = randomUUID();
  const order = await reserveOrder(
    {
      id,
      number: `VN-${id.slice(0, 8).toUpperCase()}`,
      accessHash,
      idempotencyKey: input.idempotencyKey,
      requestHash,
      customer: input.customer,
      address: input.address,
      items: lines,
      ...totals,
      couponCode: coupon?.code || "",
      shipping,
      status: "pending_payment",
      inventoryState: "reserved",
      paymentMethod: input.method,
      paymentId: "",
      paymentStatus: "created",
      trackingCode: "",
      history: [
        {
          at: now,
          status: "pending_payment",
          message: isDemo()
            ? "Pedido demonstrativo. Nenhuma cobrança será realizada."
            : "Pedido criado. Aguardando pagamento.",
        },
      ],
      demo: isDemo(),
      createdAt: now,
      updatedAt: now,
    },
    coupon,
  );
  if (order.paymentStatus !== "created") return publicOrder(order);
  return publicOrder(await startPayment(order, card));
}
