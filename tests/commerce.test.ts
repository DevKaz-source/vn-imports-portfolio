import { describe, it, expect } from "vitest";
import { createSeed } from "@/domain/seed";
import {
  calculateTotals,
  resolveLines,
  consolidate,
  canTransition,
} from "@/domain/commerce";
import { checkoutSchema, productSchema } from "@/domain/validation";
import { paymentOutcome } from "@/integrations/payments";
import { buildQuote, MelhorEnvioProvider } from "@/integrations/shipping";
const state = createSeed();
const p = state.products[0];
const available = p.variants[0];
const lines = () =>
  resolveLines(
    state.products,
    [{ productId: p.id, variantId: available.id, quantity: 2 }],
    state.settings,
  );
describe("Preços, variações, cupons e frete", () => {
  it("rejeita variação esgotada", () => {
    expect(() =>
      resolveLines(
        state.products,
        [{ productId: p.id, variantId: p.variants[1].id, quantity: 1 }],
        state.settings,
      ),
    ).toThrow("Estoque insuficiente");
  });
  it("agrupa entradas duplicadas antes de validar estoque", () => {
    expect(() =>
      resolveLines(
        state.products,
        [
          { productId: p.id, variantId: available.id, quantity: 4 },
          { productId: p.id, variantId: available.id, quantity: 4 },
        ],
        state.settings,
      ),
    ).toThrow("Estoque insuficiente");
  });
  it("não aceita variação vinculada a outro produto", () => {
    expect(() =>
      consolidate([
        { productId: p.id, variantId: available.id, quantity: 1 },
        {
          productId: state.products[1].id,
          variantId: available.id,
          quantity: 1,
        },
      ]),
    ).toThrow();
  });
  it("calcula cupom e Pix em centavos, com arredondamento previsível", () => {
    const total = calculateTotals(lines(), 1990, "pix", state.coupons[0]);
    expect(total).toMatchObject({
      subtotalCents: 23980,
      discountCents: 2398,
      pixDiscountCents: 1079,
      shippingCents: 1990,
      totalCents: 22493,
    });
    expect(Number.isInteger(total.totalCents)).toBe(true);
  });
  it("não aplica Pix ao pagamento por cartão", () => {
    expect(calculateTotals(lines(), 0, "card").pixDiscountCents).toBe(0);
  });
  it("rejeita cupom expirado e mínimo não atingido", () => {
    expect(() =>
      calculateTotals(lines(), 0, "pix", {
        ...state.coupons[0],
        expiresAt: "2000-01-01T00:00:00.000Z",
      }),
    ).toThrow("expirou");
    expect(() =>
      calculateTotals(lines(), 0, "pix", {
        ...state.coupons[0],
        minimumCents: 99999,
      }),
    ).toThrow("a partir");
  });
  it("respeita escopo de produtos do cupom", () => {
    expect(() =>
      calculateTotals(lines(), 0, "pix", {
        ...state.coupons[0],
        productIds: [state.products[1].id],
      }),
    ).toThrow("não se aplica");
  });
  it("schema rejeita injeção de preço/stock no checkout", () => {
    expect(checkoutSchema.safeParse({ items: [], totalCents: 1 }).success).toBe(
      false,
    );
  });
  it("schema rejeita preço fracionado em centavos e combinações duplicadas", () => {
    expect(productSchema.safeParse({ ...p, priceCents: 1.5 }).success).toBe(
      false,
    );
    expect(
      productSchema.safeParse({
        ...p,
        variants: [available, { ...available, id: crypto.randomUUID() }],
      }).success,
    ).toBe(false);
  });
  it("cotação demonstrativa é explicitamente marcada", async () => {
    process.env.STORE_MODE = "demo";
    const q = await buildQuote(
      state,
      [{ productId: p.id, variantId: available.id, quantity: 1 }],
      "79002000",
    );
    expect(q.options.every((o) => o.demo)).toBe(true);
    expect(q.cartHash).toHaveLength(64);
  });
  it("rejeita CEP inválido e provedor sem configuração", async () => {
    await expect(
      buildQuote(
        state,
        [{ productId: p.id, variantId: available.id, quantity: 1 }],
        "123",
      ),
    ).rejects.toThrow("CEP");
    await expect(
      new MelhorEnvioProvider().quote(state, [], "79002000"),
    ).rejects.toThrow("configurado");
  });
});
describe("Confirmação de pagamento", () => {
  const remote = {
    id: "ORDABC",
    external_reference: p.id,
    status: "processed",
    status_detail: "accredited",
    total_amount: "119.90",
    total_paid_amount: "119.90",
    transactions: {
      payments: [
        {
          id: "PAYABC",
          status: "processed",
          status_detail: "accredited",
          paid_amount: "119.90",
        },
      ],
    },
  };
  it("aprova somente status creditado e valor efetivamente pago correto", () => {
    expect(paymentOutcome(remote, 11990)).toBe("paid");
    expect(
      paymentOutcome({ ...remote, total_paid_amount: "1.00" }, 11990),
    ).toBe("pending_payment");
    expect(
      paymentOutcome({ ...remote, status: "action_required" }, 11990),
    ).toBe("pending_payment");
  });
  it("impede transições regressivas ou de entrega sem pagamento", () => {
    expect(canTransition("pending_payment", "shipped")).toBe(false);
    expect(canTransition("paid", "pending_payment")).toBe(false);
    expect(canTransition("paid", "processing")).toBe(true);
  });
});
