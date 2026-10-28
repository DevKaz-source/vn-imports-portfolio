"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { ShippingQuote } from "@/domain/types";
import { money } from "@/domain/commerce";
import { useCartItems, useStore } from "./store-provider";
import { CartLines } from "./store-shell";
import { ShippingCalculator } from "./shipping-calculator";
import { Empty } from "./ui";
import { api } from "@/lib/utils";
export type Totals = {
  subtotalCents: number;
  discountCents: number;
  pixDiscountCents: number;
  shippingCents: number;
  totalCents: number;
  couponCode: string;
};
export function CartPage() {
  const { cart, catalog } = useStore();
  const items = useCartItems();
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [selected, setSelected] = useState("");
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState("");
  const [error, setError] = useState("");
  const [totals, setTotals] = useState<Totals | null>(null);
  const key = JSON.stringify(cart);
  useEffect(() => {
    setTotals(null);
    setApplied("");
  }, [key]);
  async function apply() {
    setError("");
    try {
      const result = await api<Totals>("/api/pricing", {
        items: cart,
        coupon,
        method: "pix",
      });
      setTotals(result);
      setApplied(result.couponCode);
      sessionStorage.setItem("vn:coupon", result.couponCode);
    } catch (e) {
      setError((e as Error).message);
      setTotals(null);
      setApplied("");
    }
  }
  const subtotal = items.reduce((s, l) => s + l.price * l.quantity, 0);
  const shipping =
    quote?.options.find((o) => o.id === selected)?.priceCents || 0;
  return (
    <div className="page">
      <p className="eyebrow">SEU PRÓXIMO FIT COMEÇA AQUI</p>
      <h1 className="page-title">SUA SACOLA.</h1>
      {items.length ? (
        <div className="cart-page-grid">
          <div>
            <CartLines />
            <Link
              className="text-link"
              href="/produtos"
              style={{ marginTop: 20 }}
            >
              CONTINUAR EXPLORANDO
            </Link>
          </div>
          <aside className="order-summary">
            <h2>RESUMO DA SACOLA</h2>
            <div className="summary-line">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div className="coupon-form">
              <input
                aria-label="Cupom de desconto"
                placeholder="Tem um cupom?"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              />
              <button className="button button-outline" onClick={apply}>
                APLICAR
              </button>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {applied && (
              <p className="success">
                Cupom {applied} aplicado. Desconto sujeito à validação no
                checkout.
              </p>
            )}
            {totals && (
              <div className="summary-line">
                <span>Desconto do cupom</span>
                <span>− {money(totals.discountCents)}</span>
              </div>
            )}
            <ShippingCalculator
              items={cart}
              onQuote={setQuote}
              selectedId={selected}
              onSelect={setSelected}
            />
            <div className="summary-line total">
              <span>Subtotal + entrega</span>
              <strong>
                {money(subtotal - (totals?.discountCents || 0) + shipping)}
              </strong>
            </div>
            <p className="small muted">
              {quote
                ? "Desconto Pix calculado ao escolher o pagamento."
                : "Calcule a entrega para consultar o total."}
            </p>
            <Link className="button full" href="/checkout">
              CONTINUAR PARA O CHECKOUT
            </Link>
            {catalog.demo && (
              <p className="small muted" style={{ marginTop: 15 }}>
                Pedido demonstrativo. Nenhuma cobrança real.
              </p>
            )}
          </aside>
        </div>
      ) : (
        <Empty
          title="Ainda falta o seu toque."
          description="Sua sacola está vazia. Encontre as peças que combinam com você."
        >
          <Link className="button" href="/produtos">
            EXPLORAR A SELEÇÃO
          </Link>
        </Empty>
      )}
    </div>
  );
}
