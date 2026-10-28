import { randomUUID } from "node:crypto";
import { cache } from "react";
import type {
  Catalog,
  Coupon,
  Order,
  OrderStatus,
  Product,
  ShippingQuote,
  State,
} from "@/domain/types";
import {
  calculateTotals,
  canTransition,
  CommerceError,
  resolveLines,
} from "@/domain/commerce";
import { createSeed, defaultSettings } from "@/domain/seed";
import { demoTransaction, readDemo } from "./demo-store";
import { assertConfig, isDemo } from "./config";
import { serviceDb } from "./supabase";
const entityNames = [
  "categories",
  "collections",
  "looks",
  "social",
  "banners",
  "coupons",
] as const;
export type EntityName = (typeof entityNames)[number];
export const isEntity = (s: string): s is EntityName =>
  entityNames.includes(s as EntityName);
function dbError(error: { message: string } | null) {
  if (!error) return;
  const code = error.message.split(":")[0];
  if (["STOCK", "PRICE", "CONFLICT", "COUPON", "VARIANT"].includes(code))
    throw new CommerceError(
      error.message.split(":").slice(1).join(":").trim(),
      409,
    );
  throw new Error("Falha na operação de dados.");
}
async function loadProducts(): Promise<Product[]> {
  const db = serviceDb();
  const results = await Promise.all([
    db.from("products").select("id,data"),
    db.from("product_variants").select("product_id,stock,data"),
    db
      .from("product_images")
      .select("product_id,data,position")
      .order("position"),
  ]);
  results.forEach((r) => dbError(r.error));
  const [p, v, i] = results;
  return (p.data || []).map(
    (row) =>
      ({
        ...row.data,
        variants: (v.data || [])
          .filter((x) => x.product_id === row.id)
          .map((x) => ({ ...x.data, stock: x.stock })),
        images: (i.data || [])
          .filter((x) => x.product_id === row.id)
          .map((x) => x.data),
      }) as Product,
  );
}
export async function getState(): Promise<State> {
  assertConfig();
  if (isDemo()) return readDemo();
  const db = serviceDb();
  const products = loadProducts();
  const result = await Promise.all(
    entityNames.map((name) => db.from(name).select("data")),
  );
  result.forEach((r) => dbError(r.error));
  const [settings, orders, movements] = await Promise.all([
    db.from("store_settings").select("data").eq("id", 1).maybeSingle(),
    db.from("orders").select("data").order("created_at", { ascending: false }),
    db
      .from("inventory_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  [settings, orders, movements].forEach((r) => dbError(r.error));
  const entities = Object.fromEntries(
    entityNames.map((name, i) => [
      name,
      (result[i].data || []).map((r) => r.data),
    ]),
  );
  return {
    ...createSeed(),
    ...entities,
    products: await products,
    settings: settings.data?.data || structuredClone(defaultSettings),
    orders: (orders.data || []).map((r) => r.data),
    movements: (movements.data || []).map((m) => ({
      id: m.id,
      productId: m.product_id,
      variantId: m.variant_id,
      delta: m.delta,
      reason: m.reason,
      orderId: m.order_id,
      actor: m.actor,
      createdAt: m.created_at,
    })),
    quotes: [],
    newsletter: [],
  } as State;
}
export const getCatalog = cache(async (): Promise<Catalog> => {
  assertConfig();
  let state: Pick<
    State,
    | "products"
    | "settings"
    | "categories"
    | "collections"
    | "banners"
    | "looks"
    | "social"
  >;
  if (isDemo()) {
    const all = await readDemo();
    state = {
      ...all,
      products: all.products.map((p) => ({
        ...p,
        soldCount: all.orders
          .filter((o) =>
            ["paid", "processing", "shipped", "delivered"].includes(o.status),
          )
          .flatMap((o) => o.items)
          .filter((i) => i.productId === p.id)
          .reduce((s, i) => s + i.quantity, 0),
      })),
    };
  } else {
    const db = serviceDb();
    const names = [
      "categories",
      "collections",
      "banners",
      "looks",
      "social",
    ] as const;
    const [products, settings, ...entities] = await Promise.all([
      loadProducts(),
      db.from("store_settings").select("data").eq("id", 1).maybeSingle(),
      ...names.map((n) => db.from(n).select("data")),
    ]);
    dbError(settings.error);
    entities.forEach((r) => dbError(r.error));
    const { data: sales, error: salesError } = await db.rpc("sales_counts");
    dbError(salesError);
    state = {
      products: products.map((p) => ({
        ...p,
        soldCount:
          ((sales as { product_id: string; quantity: number }[]) || []).find(
            (s) => s.product_id === p.id,
          )?.quantity || 0,
      })),
      settings: settings.data?.data || structuredClone(defaultSettings),
      ...Object.fromEntries(
        names.map((n, i) => [n, (entities[i].data || []).map((r) => r.data)]),
      ),
    } as typeof state;
  }
  return {
    products: state.products
      .filter((p) => p.status === "active")
      .map((p) => {
        const clean = { ...p };
        delete clean.costCents;
        return clean;
      }),
    categories: state.categories.filter((c) => c.active),
    collections: state.collections.filter((c) => c.active),
    banners: state.banners.filter(
      (b) =>
        b.active &&
        (!b.startsAt || Date.parse(b.startsAt) <= Date.now()) &&
        (!b.endsAt || Date.parse(b.endsAt) > Date.now()),
    ),
    looks: state.looks.filter((l) => l.active),
    social: state.social,
    settings: state.settings,
    demo: isDemo(),
  };
});
export async function saveProduct(
  product: Product,
  expectedUpdatedAt?: string,
) {
  const p = { ...product, updatedAt: new Date().toISOString() };
  if (isDemo())
    return demoTransaction((state) => {
      const old = state.products.find((x) => x.id === p.id);
      if (old && expectedUpdatedAt !== old.updatedAt)
        throw new CommerceError(
          "Essa peça foi alterada. Atualize o painel antes de salvar.",
          409,
        );
      if (state.products.some((x) => x.id !== p.id && x.slug === p.slug))
        throw new CommerceError("Este endereço de produto já está em uso.");
      if (
        p.variants.some((v) =>
          state.products.some(
            (x) =>
              x.id !== p.id &&
              x.variants.some((ov) => ov.sku === v.sku || ov.id === v.id),
          ),
        )
      )
        throw new CommerceError("SKU ou variação já usados por outra peça.");
      if (old?.variants.some((v) => !p.variants.some((n) => n.id === v.id)))
        throw new CommerceError(
          "Desative variações existentes em vez de excluí-las.",
        );
      p.variants = p.variants.map((v) => {
        const previous = old?.variants.find((x) => x.id === v.id);
        if (!previous && v.stock)
          state.movements.unshift({
            id: randomUUID(),
            productId: p.id,
            variantId: v.id,
            delta: v.stock,
            reason: "Estoque inicial",
            actor: "admin",
            createdAt: p.updatedAt,
          });
        return { ...v, stock: previous?.stock ?? v.stock };
      });
      state.products = [...state.products.filter((x) => x.id !== p.id), p];
      return p;
    });
  const { error } = await serviceDb().rpc("save_product", {
    p,
    expected_updated_at: expectedUpdatedAt ?? null,
  });
  dbError(error);
  return p;
}
export async function deleteProduct(id: string) {
  const state = await getState();
  if (state.orders.some((o) => o.items.some((i) => i.productId === id)))
    throw new CommerceError(
      "Esta peça possui pedidos. Arquive-a para preservar o histórico.",
    );
  if (isDemo())
    return demoTransaction((s) => {
      s.products = s.products.filter((p) => p.id !== id);
      s.movements = s.movements.filter((m) => m.productId !== id);
    });
  throw new CommerceError(
    "Para preservar variações e movimentos, use Arquivar.",
  );
}
export async function saveEntity(
  name: EntityName,
  data: State[EntityName][number],
  remove = false,
) {
  if (isDemo())
    return demoTransaction((s) => {
      const rows = s[name] as { id: string }[];
      if (
        remove &&
        name === "categories" &&
        s.products.some(
          (p) => p.categoryId === data.id && p.status !== "archived",
        )
      )
        throw new CommerceError(
          "Há produtos nessa categoria. Desative ou mova as peças antes de excluir.",
        );
      const next = rows.filter((r) => r.id !== data.id);
      if (!remove) next.push(data);
      Object.assign(s, { [name]: next });
    });
  const db = serviceDb();
  if (remove) {
    if (name === "categories") {
      const state = await getState();
      if (
        state.products.some(
          (p) => p.categoryId === data.id && p.status !== "archived",
        )
      )
        throw new CommerceError("Há produtos nessa categoria.");
    }
    const { error } = await db.from(name).delete().eq("id", data.id);
    dbError(error);
  } else {
    const { error } = await db.from(name).upsert({
      id: data.id,
      data,
      ...(name === "coupons" ? { code: (data as Coupon).code } : {}),
    });
    dbError(error);
  }
}
export async function saveSettings(settings: State["settings"]) {
  if (isDemo())
    return demoTransaction((s) => {
      s.settings = settings;
    });
  const { error } = await serviceDb()
    .from("store_settings")
    .upsert({ id: 1, data: settings });
  dbError(error);
}
export async function adjustInventory(
  variantId: string,
  delta: number,
  reason: string,
  actor: string,
) {
  if (isDemo())
    return demoTransaction((s) => {
      const p = s.products.find((p) =>
        p.variants.some((v) => v.id === variantId),
      );
      const v = p?.variants.find((v) => v.id === variantId);
      if (!p || !v || v.stock + delta < 0)
        throw new CommerceError("Estoque insuficiente para esse ajuste.");
      v.stock += delta;
      s.movements.unshift({
        id: randomUUID(),
        productId: p.id,
        variantId,
        delta,
        reason,
        actor,
        createdAt: new Date().toISOString(),
      });
    });
  const { error } = await serviceDb().rpc("adjust_inventory", {
    p_variant: variantId,
    p_delta: delta,
    p_reason: reason,
    p_actor: actor,
  });
  dbError(error);
}
export async function saveQuote(quote: ShippingQuote) {
  if (isDemo())
    return demoTransaction((s) => {
      s.quotes = [
        ...s.quotes.filter((q) => Date.parse(q.expiresAt) > Date.now()),
        quote,
      ].slice(-500);
    });
  const { error } = await serviceDb()
    .from("shipping_quotes")
    .insert({ id: quote.id, data: quote, expires_at: quote.expiresAt });
  dbError(error);
}
export async function getQuote(id: string) {
  if (isDemo()) return (await readDemo()).quotes.find((q) => q.id === id);
  const { data, error } = await serviceDb()
    .from("shipping_quotes")
    .select("data")
    .eq("id", id)
    .maybeSingle();
  dbError(error);
  return data?.data as ShippingQuote | undefined;
}
export async function getOrder(id: string) {
  if (isDemo()) return (await readDemo()).orders.find((o) => o.id === id);
  const { data, error } = await serviceDb()
    .from("orders")
    .select("data")
    .eq("id", id)
    .maybeSingle();
  dbError(error);
  return data?.data as Order | undefined;
}
export async function getOrderByKey(key: string) {
  if (isDemo())
    return (await readDemo()).orders.find((o) => o.idempotencyKey === key);
  const { data, error } = await serviceDb()
    .from("orders")
    .select("data")
    .eq("idempotency_key", key)
    .maybeSingle();
  dbError(error);
  return data?.data as Order | undefined;
}
export async function reserveOrder(order: Order, coupon?: Coupon) {
  if (isDemo())
    return demoTransaction((s) => {
      const old = s.orders.find(
        (o) => o.idempotencyKey === order.idempotencyKey,
      );
      if (old) {
        if (
          old.requestHash !== order.requestHash ||
          old.accessHash !== order.accessHash
        )
          throw new CommerceError("Chave de compra já utilizada.", 409);
        return old;
      }
      const lines = resolveLines(s.products, order.items, s.settings);
      const freshCoupon = order.couponCode
        ? s.coupons.find((c) => c.code === order.couponCode)
        : undefined;
      if (order.couponCode && !freshCoupon)
        throw new CommerceError("Cupom indisponível.");
      const totals = calculateTotals(
        lines,
        order.shippingCents,
        order.paymentMethod,
        freshCoupon,
        s.orders,
        order.customer.email,
      );
      if (totals.totalCents !== order.totalCents)
        throw new CommerceError("O preço mudou. Atualize a sacola.", 409);
      for (const item of order.items) {
        const p = s.products.find((p) => p.id === item.productId)!;
        p.variants.find((v) => v.id === item.variantId)!.stock -= item.quantity;
        s.movements.unshift({
          id: randomUUID(),
          productId: p.id,
          variantId: item.variantId,
          delta: -item.quantity,
          reason: "Reserva de pedido",
          orderId: order.id,
          actor: "checkout",
          createdAt: order.createdAt,
        });
      }
      s.orders.unshift(order);
      return order;
    });
  const { data, error } = await serviceDb().rpc("reserve_order", {
    p: order,
    p_coupon: coupon ?? null,
  });
  dbError(error);
  return data as Order;
}
export async function updateOrder(
  id: string,
  status: OrderStatus,
  message: string,
  patch: Partial<
    Pick<
      Order,
      | "paymentId"
      | "paymentStatus"
      | "qrCode"
      | "qrBase64"
      | "paymentUrl"
      | "trackingCode"
    >
  > = {},
) {
  if (isDemo())
    return demoTransaction((s) => {
      const o = s.orders.find((o) => o.id === id);
      if (!o) throw new CommerceError("Pedido não encontrado.", 404);
      if (!canTransition(o.status, status)) return o;
      if (status === "cancelled" && o.inventoryState === "reserved") {
        for (const item of o.items) {
          const p = s.products.find((p) => p.id === item.productId)!;
          p.variants.find((v) => v.id === item.variantId)!.stock +=
            item.quantity;
          s.movements.unshift({
            id: randomUUID(),
            productId: p.id,
            variantId: item.variantId,
            delta: item.quantity,
            reason: "Reserva liberada",
            orderId: id,
            actor: "payment",
            createdAt: new Date().toISOString(),
          });
        }
        o.inventoryState = "released";
      }
      if (status === "paid") o.inventoryState = "committed";
      if (o.status !== status)
        o.history.push({ at: new Date().toISOString(), status, message });
      Object.assign(o, patch, { status, updatedAt: new Date().toISOString() });
      return o;
    });
  const { data, error } = await serviceDb().rpc("apply_order_status", {
    p_id: id,
    p_status: status,
    p_message: message,
    p_patch: patch,
  });
  dbError(error);
  return data as Order;
}
export async function subscribe(email: string) {
  if (isDemo())
    return demoTransaction((s) => {
      if (!s.newsletter.some((n) => n.email === email))
        s.newsletter.push({
          id: randomUUID(),
          email,
          consentAt: new Date().toISOString(),
          source: "VN List v1",
        });
    });
  const { error } = await serviceDb()
    .from("newsletter")
    .upsert(
      { email, consent_at: new Date().toISOString(), source: "VN List v1" },
      { onConflict: "email" },
    );
  dbError(error);
}
export async function getSubscribers() {
  if (isDemo()) return (await readDemo()).newsletter;
  const { data, error } = await serviceDb()
    .from("newsletter")
    .select("*")
    .order("consent_at", { ascending: false })
    .limit(10000);
  dbError(error);
  return data;
}
export function publicOrder(order: Order) {
  const {
    id,
    number,
    status,
    items,
    subtotalCents,
    discountCents,
    pixDiscountCents,
    shippingCents,
    totalCents,
    shipping,
    trackingCode,
    paymentMethod,
    paymentStatus,
    qrCode,
    qrBase64,
    paymentUrl,
    history,
    demo,
    createdAt,
  } = order;
  return {
    id,
    number,
    status,
    items,
    subtotalCents,
    discountCents,
    pixDiscountCents,
    shippingCents,
    totalCents,
    shipping,
    trackingCode,
    paymentMethod,
    paymentStatus,
    qrCode,
    qrBase64,
    paymentUrl,
    history,
    demo,
    createdAt,
  };
}
