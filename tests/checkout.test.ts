import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { demoTransaction, readDemo } from "@/server/demo-store";
import {
  saveQuote,
  getOrder,
  updateOrder,
  adjustInventory,
} from "@/server/repository";
import { buildQuote } from "@/integrations/shipping";
import { checkout } from "@/server/checkout";
import { applyRemotePayment } from "@/integrations/payments";
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "vn-test-"));
  process.env.DEMO_DATA_DIR = dir;
  process.env.STORE_MODE = "demo";
  delete process.env.VERCEL;
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  delete process.env.DEMO_DATA_DIR;
});
async function input() {
  const state = await readDemo();
  const p = state.products[0];
  const items = [{ productId: p.id, variantId: p.variants[0].id, quantity: 1 }];
  const quote = await buildQuote(state, items, "79002000");
  await saveQuote(quote);
  return {
    items,
    customer: {
      name: "Cliente Teste",
      email: "teste@example.com",
      phone: "67999999999",
    },
    address: {
      cep: "79002000",
      street: "Rua de teste",
      number: "10",
      complement: "",
      district: "Centro",
      city: "Campo Grande",
      state: "MS",
    },
    quoteId: quote.id,
    shippingId: quote.options[0].id,
    coupon: "",
    method: "pix" as const,
    idempotencyKey: randomUUID(),
    accessToken: randomBytes(32).toString("hex"),
  };
}
describe("Checkout integrado em modo demo", () => {
  it("cria pedido pendente, reserva estoque e mantém idempotência", async () => {
    const i = await input();
    const result = await checkout(i);
    expect(result.status).toBe("pending_payment");
    expect(result.demo).toBe(true);
    const again = await checkout(i);
    expect(again.id).toBe(result.id);
    const state = await readDemo();
    expect(state.orders).toHaveLength(1);
    expect(state.products[0].variants[0].stock).toBe(4);
    expect(state.movements).toHaveLength(1);
  });
  it("duas compras concorrentes da última unidade resultam em uma venda", async () => {
    await demoTransaction((s) => {
      s.products[0].variants[0].stock = 1;
    });
    const a = await input();
    const b = await input();
    const results = await Promise.allSettled([checkout(a), checkout(b)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await readDemo()).products[0].variants[0].stock).toBe(0);
    expect((await readDemo()).orders).toHaveLength(1);
  });
  it("webhook repetido não baixa estoque de novo ou duplica histórico", async () => {
    const i = await input();
    const result = await checkout(i);
    const order = (await getOrder(result.id))!;
    const remote = {
      id: "ORDABC123",
      external_reference: order.id,
      total_amount: (order.totalCents / 100).toFixed(2),
      total_paid_amount: (order.totalCents / 100).toFixed(2),
      status: "processed",
      status_detail: "accredited",
      transactions: {
        payments: [
          {
            id: "PAYABC",
            status: "processed",
            status_detail: "accredited",
            paid_amount: (order.totalCents / 100).toFixed(2),
          },
        ],
      },
    };
    await applyRemotePayment(order, remote);
    await applyRemotePayment(order, remote);
    const state = await readDemo();
    expect(state.products[0].variants[0].stock).toBe(4);
    expect(
      state.orders[0].history.filter((e) => e.status === "paid"),
    ).toHaveLength(1);
    expect(state.orders[0].inventoryState).toBe("committed");
  });
  it("cancelamento repetido devolve estoque uma única vez", async () => {
    const result = await checkout(await input());
    await updateOrder(result.id, "cancelled", "Teste");
    await updateOrder(result.id, "cancelled", "Repetição");
    const state = await readDemo();
    expect(state.products[0].variants[0].stock).toBe(5);
    expect(state.movements).toHaveLength(2);
  });
  it("rejeita alteração da sacola após cotação e dados financeiros forjados", async () => {
    const i = await input();
    await expect(
      checkout({ ...i, items: [{ ...i.items[0], quantity: 2 }] }),
    ).rejects.toThrow("frete");
    await expect(checkout({ ...i, totalCents: 1 })).rejects.toThrow();
  });
  it("não aceita reutilização de chave com outra identidade de acesso", async () => {
    const i = await input();
    await checkout(i);
    await expect(
      checkout({ ...i, accessToken: randomBytes(32).toString("hex") }),
    ).rejects.toThrow("utilizada");
  });
  it("limite por cliente é contado também em pedidos pendentes", async () => {
    const a = await input();
    await checkout({ ...a, coupon: "VNDEMO10" });
    const b = await input();
    await expect(checkout({ ...b, coupon: "VNDEMO10" })).rejects.toThrow(
      "já utilizou",
    );
  });
  it("não permite ajuste que torne estoque negativo e registra motivo", async () => {
    const s = await readDemo();
    const id = s.products[0].variants[0].id;
    await expect(
      adjustInventory(id, -100, "Ajuste teste", "admin"),
    ).rejects.toThrow("insuficiente");
    await adjustInventory(id, 10, "Reposição teste", "admin");
    expect((await readDemo()).products[0].variants[0].stock).toBe(15);
    expect((await readDemo()).movements[0].reason).toBe("Reposição teste");
  });
});
