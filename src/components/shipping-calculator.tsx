"use client";
import { useEffect, useState } from "react";
import type { CartLine, ShippingQuote } from "@/domain/types";
import { money, digits } from "@/domain/commerce";
import { api } from "@/lib/utils";
export function ShippingCalculator({
  items,
  onQuote,
  selectedId,
  onSelect,
  defaultCep = "",
}: {
  items: CartLine[];
  onQuote?: (quote: ShippingQuote | null) => void;
  selectedId?: string;
  onSelect?: (id: string) => void;
  defaultCep?: string;
}) {
  const [cep, setCep] = useState(defaultCep);
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const key = JSON.stringify(items);
  useEffect(() => {
    setQuote(null);
    onQuote?.(null);
    onSelect?.("");
  }, [key, onQuote, onSelect]);
  async function calculate() {
    setError("");
    setQuote(null);
    onQuote?.(null);
    onSelect?.("");
    if (!items.length) {
      setError("Escolha um tamanho para calcular o frete.");
      return;
    }
    if (digits(cep).length !== 8) {
      setError("Informe um CEP com 8 números.");
      return;
    }
    setBusy(true);
    try {
      const result = await api<ShippingQuote>("/api/shipping", {
        items,
        cep: digits(cep),
      });
      setQuote(result);
      onQuote?.(result);
      onSelect?.(result.options[0]?.id || "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="shipping-box">
      <h3>Calcule a entrega</h3>
      <div className="shipping-form">
        <input
          aria-label="CEP para calcular frete"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          maxLength={9}
          value={cep}
          onChange={(e) => {
            const n = digits(e.target.value).slice(0, 8);
            setCep(n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n);
            if (quote) {
              setQuote(null);
              onQuote?.(null);
              onSelect?.("");
            }
          }}
        />
        <button
          className="button button-outline"
          type="button"
          onClick={calculate}
          disabled={busy}
        >
          {busy ? "CONSULTANDO…" : "CALCULAR"}
        </button>
      </div>
      {error && (
        <p className="error" role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
      {quote && (
        <div className="shipping-options">
          {quote.options.map((o) => (
            <label className="shipping-option" key={o.id}>
              {onSelect && (
                <input
                  type="radio"
                  name="shipping"
                  value={o.id}
                  checked={selectedId === o.id}
                  onChange={() => onSelect(o.id)}
                />
              )}
              <span>
                {o.name}
                <small>
                  {o.carrier} · {o.days} dias úteis estimados
                </small>
              </span>
              <strong>{o.priceCents ? money(o.priceCents) : "Grátis"}</strong>
            </label>
          ))}
          {quote.options.some((o) => o.demo) && (
            <p className="small muted" style={{ marginTop: 10 }}>
              Simulação demonstrativa. Valores e prazos não são cotações reais.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
