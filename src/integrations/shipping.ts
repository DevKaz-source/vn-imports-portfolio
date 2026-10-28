import { randomUUID } from "node:crypto";
import type {
  CartLine,
  ShippingOption,
  ShippingQuote,
  State,
} from "@/domain/types";
import { CommerceError, resolveLines } from "@/domain/commerce";
import { isDemo } from "@/server/config";
import { hash } from "@/server/security";
export const cartHash = (items: CartLine[]) =>
  hash(
    JSON.stringify(
      [...items]
        .sort((a, b) => a.variantId.localeCompare(b.variantId))
        .map(({ productId, variantId, quantity }) => ({
          productId,
          variantId,
          quantity,
        })),
    ),
  );
export interface ShippingProvider {
  quote(
    state: State,
    items: CartLine[],
    cep: string,
  ): Promise<ShippingOption[]>;
}
export class DemoShippingProvider implements ShippingProvider {
  async quote(state: State, items: CartLine[], cep: string) {
    void state;
    void items;
    if (!/^\d{8}$/.test(cep) || /^0{8}$/.test(cep))
      throw new CommerceError("Informe um CEP válido.");
    return [
      {
        id: "demo-standard",
        name: "Entrega padrão · simulação",
        carrier: "Demonstração",
        priceCents: 1990,
        days: 7,
        demo: true,
      },
      {
        id: "demo-express",
        name: "Entrega expressa · simulação",
        carrier: "Demonstração",
        priceCents: 2990,
        days: 3,
        demo: true,
      },
    ];
  }
}
type MelhorQuote = {
  id: number;
  name: string;
  price?: string;
  custom_price?: string;
  delivery_time?: number;
  custom_delivery_time?: number;
  company?: { name: string };
  error?: string;
};
export class MelhorEnvioProvider implements ShippingProvider {
  async quote(state: State, items: CartLine[], cep: string) {
    const token = process.env.MELHOR_ENVIO_TOKEN;
    const origin = state.settings.originCep;
    const userAgent = process.env.MELHOR_ENVIO_USER_AGENT;
    if (!token || !origin || !userAgent)
      throw new CommerceError(
        "O frete ainda não está configurado. Fale com a loja.",
        503,
      );
    const products = items.map((line) => {
      const p = state.products.find((p) => p.id === line.productId)!;
      if (!p.weightKg || !p.widthCm || !p.heightCm || !p.lengthCm)
        throw new CommerceError(
          "Esta peça precisa ter peso e dimensões cadastrados para calcular o frete.",
          422,
        );
      return {
        id: line.variantId,
        width: p.widthCm,
        height: p.heightCm,
        length: p.lengthCm,
        weight: p.weightKg,
        insurance_value:
          (p.variants.find((v) => v.id === line.variantId)?.priceCents ??
            p.priceCents) / 100,
        quantity: line.quantity,
      };
    });
    const base =
      process.env.MELHOR_ENVIO_ENV === "production"
        ? "https://melhorenvio.com.br"
        : "https://sandbox.melhorenvio.com.br";
    const response = await fetch(`${base}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": userAgent,
      },
      body: JSON.stringify({
        from: { postal_code: origin },
        to: { postal_code: cep },
        products,
        services: state.settings.shippingServices || undefined,
        options: { receipt: false, own_hand: false, collect: false },
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok)
      throw new CommerceError(
        "Não conseguimos consultar as transportadoras. Tente novamente.",
        503,
      );
    const payload: MelhorQuote[] | MelhorQuote = await response.json();
    const data = Array.isArray(payload) ? payload : [payload];
    const options = data
      .filter(
        (q) =>
          !q.error &&
          Number.isFinite(Number(q.custom_price ?? q.price)) &&
          Number(q.custom_price ?? q.price) >= 0,
      )
      .map((q) => ({
        id: String(q.id),
        name: q.name,
        carrier: q.company?.name || "Transportadora",
        priceCents: Math.round(Number(q.custom_price ?? q.price) * 100),
        days:
          (q.custom_delivery_time ?? q.delivery_time ?? 0) +
          state.settings.preparationDays,
        demo: process.env.MELHOR_ENVIO_ENV !== "production",
      }));
    if (!options.length)
      throw new CommerceError(
        "Nenhuma modalidade disponível para esse CEP.",
        422,
      );
    return options;
  }
}
export async function buildQuote(
  state: State,
  items: CartLine[],
  cep: string,
): Promise<ShippingQuote> {
  const lines = resolveLines(state.products, items, state.settings);
  const provider: ShippingProvider = isDemo()
    ? new DemoShippingProvider()
    : new MelhorEnvioProvider();
  let options: ShippingOption[] = [];
  let providerError: unknown;
  try {
    options = await provider.quote(state, items, cep);
  } catch (e) {
    providerError = e;
  }
  const subtotal = lines.reduce((s, l) => s + l.unitCents * l.quantity, 0);
  if (
    state.settings.freeShippingFromCents > 0 &&
    subtotal >= state.settings.freeShippingFromCents &&
    options.length
  ) {
    const cheapest = options.reduce((a, b) =>
      a.priceCents < b.priceCents ? a : b,
    );
    options = options.map((o) =>
      o.id === cheapest.id
        ? { ...o, priceCents: 0, name: `${o.name} · frete grátis` }
        : o,
    );
  }
  if (state.settings.pickupEnabled && state.settings.pickupName)
    options.push({
      id: "pickup",
      name: `Retirada: ${state.settings.pickupName}`,
      carrier: "VN Imports",
      priceCents: 0,
      days: state.settings.preparationDays,
      demo: isDemo(),
    });
  if (!options.length)
    throw providerError || new CommerceError("Frete indisponível.", 503);
  return {
    id: randomUUID(),
    cartHash: cartHash(items),
    cep,
    options,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}
