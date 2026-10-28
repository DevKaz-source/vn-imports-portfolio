import type {
  CartLine,
  Coupon,
  Order,
  OrderLine,
  OrderStatus,
  Product,
  StoreSettings,
} from "./types";
export class CommerceError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "CommerceError";
  }
}
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const digits = (value: string) => value.replace(/\D/g, "");
export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const priceOf = (p: Product, variantId?: string) =>
  p.variants.find((v) => v.id === variantId)?.priceCents ?? p.priceCents;
export const availableStock = (p: Product) =>
  p.variants.filter((v) => v.active).reduce((sum, v) => sum + v.stock, 0);
export function consolidate(lines: CartLine[]): CartLine[] {
  const result = new Map<string, CartLine>();
  for (const line of lines) {
    const old = result.get(line.variantId);
    if (old && old.productId !== line.productId)
      throw new CommerceError("Variação inválida.");
    result.set(line.variantId, {
      ...line,
      quantity: (old?.quantity ?? 0) + line.quantity,
    });
  }
  const merged = [...result.values()];
  if (
    merged.some(
      (l) => !Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 20,
    )
  )
    throw new CommerceError("Quantidade inválida.");
  return merged.sort((a, b) => a.variantId.localeCompare(b.variantId));
}
export function resolveLines(
  products: Product[],
  cart: CartLine[],
  settings: StoreSettings,
): OrderLine[] {
  if (!cart.length) throw new CommerceError("Sua sacola está vazia.");
  return consolidate(cart).map((line) => {
    const p = products.find(
      (p) => p.id === line.productId && p.status === "active",
    );
    const v = p?.variants.find((v) => v.id === line.variantId && v.active);
    if (!p || !v)
      throw new CommerceError(
        "Uma peça da sacola não está mais disponível.",
        409,
      );
    if (v.stock < line.quantity)
      throw new CommerceError(
        `Estoque insuficiente: ${p.name}, ${v.size} / ${v.color}.`,
        409,
      );
    return {
      ...line,
      name: p.name,
      sku: v.sku,
      size: v.size,
      color: v.color,
      image: v.image || p.images[0]?.url || "",
      unitCents: priceOf(p, v.id),
      pixPercent: p.pixPercent ?? settings.pixPercent,
      categoryId: p.categoryId,
    };
  });
}
export function calculateTotals(
  lines: OrderLine[],
  shippingCents: number,
  method: "pix" | "card",
  coupon?: Coupon,
  orders: Order[] = [],
  email = "",
  now = Date.now(),
) {
  const subtotalCents = lines.reduce((s, l) => s + l.unitCents * l.quantity, 0);
  let discountCents = 0;
  if (coupon) {
    if (
      !coupon.active ||
      (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now)
    )
      throw new CommerceError("Este cupom expirou ou está inativo.");
    if (subtotalCents < coupon.minimumCents)
      throw new CommerceError(
        `Cupom válido a partir de ${money(coupon.minimumCents)}.`,
      );
    const used = orders.filter(
      (o) =>
        o.couponCode === coupon.code &&
        o.status !== "cancelled" &&
        o.status !== "refunded",
    );
    if (coupon.usageLimit > 0 && used.length >= coupon.usageLimit)
      throw new CommerceError("O limite deste cupom foi atingido.");
    if (
      email &&
      coupon.perCustomerLimit > 0 &&
      used.filter((o) => o.customer.email.toLowerCase() === email.toLowerCase())
        .length >= coupon.perCustomerLimit
    )
      throw new CommerceError("Você já utilizou este cupom.");
    const eligible = lines
      .filter(
        (l) =>
          (!coupon.productIds.length ||
            coupon.productIds.includes(l.productId)) &&
          (!coupon.categoryIds.length ||
            coupon.categoryIds.includes(l.categoryId)),
      )
      .reduce((s, l) => s + l.unitCents * l.quantity, 0);
    if (!eligible)
      throw new CommerceError("O cupom não se aplica às peças da sacola.");
    discountCents = Math.min(
      eligible,
      coupon.type === "percent"
        ? Math.round((eligible * coupon.value) / 100)
        : coupon.value,
    );
  }
  const weightedPix = lines.reduce(
    (s, l) => s + (l.unitCents * l.quantity * l.pixPercent) / 100,
    0,
  );
  const pixDiscountCents =
    method === "pix"
      ? Math.round(
          (weightedPix * (subtotalCents - discountCents)) / subtotalCents,
        )
      : 0;
  const totalCents =
    Math.max(0, subtotalCents - discountCents - pixDiscountCents) +
    shippingCents;
  if (!Number.isSafeInteger(totalCents) || totalCents < 0)
    throw new CommerceError("Total inválido.");
  return {
    subtotalCents,
    discountCents,
    pixDiscountCents,
    shippingCents,
    totalCents,
  };
}
export const statusLabels: Record<OrderStatus, string> = {
  pending_payment: "Aguardando pagamento",
  paid: "Pagamento aprovado",
  processing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};
export function canTransition(from: OrderStatus, to: OrderStatus) {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    pending_payment: ["paid", "cancelled"],
    paid: ["processing", "refunded"],
    processing: ["shipped", "refunded"],
    shipped: ["delivered", "refunded"],
    delivered: ["refunded"],
    cancelled: [],
    refunded: [],
  };
  return from === to || transitions[from].includes(to);
}
export function whatsappUrl(number: string, message: string) {
  const n = digits(number);
  return n.length >= 12 && n.length <= 15
    ? `https://wa.me/${n}?text=${encodeURIComponent(message)}`
    : null;
}
