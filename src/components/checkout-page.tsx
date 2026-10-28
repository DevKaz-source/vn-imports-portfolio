"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, ScanLine, ShieldCheck } from "lucide-react";
import type { Address, Customer, ShippingQuote } from "@/domain/types";
import type { CardToken } from "@/integrations/payments";
import type { publicOrder } from "@/server/repository";
import { money, digits } from "@/domain/commerce";
import { useCartItems, useStore } from "./store-provider";
import { Field, Empty } from "./ui";
import { ShippingCalculator } from "./shipping-calculator";
import { CardPayment } from "./card-payment";
import type { Totals } from "./cart-page";
import { api, randomToken } from "@/lib/utils";
import { track } from "./tracking";
const initialAddress: Address = {
  cep: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};
type OrderView = ReturnType<typeof publicOrder>;
export function CheckoutPage() {
  const { catalog, cart, clear } = useStore();
  const items = useCartItems();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    email: "",
    phone: "",
  });
  const [address, setAddress] = useState<Address>(initialAddress);
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [shippingId, setShippingId] = useState("");
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [addressMessage, setAddressMessage] = useState("");
  const [accepted, setAccepted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const cartKey = JSON.stringify(cart);
  useEffect(() => {
    setCoupon(sessionStorage.getItem("vn:coupon") || "");
    track("begin_checkout");
  }, []);
  useEffect(() => {
    setReview(false);
  }, [cartKey, method, shippingId, quote, appliedCoupon]);
  const totalsKey = JSON.stringify({
    items: cart,
    coupon: appliedCoupon,
    method,
    email: customer.email,
    ...(quote && shippingId ? { quoteId: quote.id, shippingId } : {}),
  });
  useEffect(() => {
    setTotals(null);
    let cancelled = false;
    const payload = JSON.parse(totalsKey);
    if (!payload.items.length) return;
    const timer = setTimeout(() => {
      void api<Totals>("/api/pricing", payload)
        .then((result) => {
          if (!cancelled) setTotals(result);
        })
        .catch((e) => {
          if (!cancelled) setError((e as Error).message);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [totalsKey]);
  async function price(code = appliedCoupon) {
    const result = await api<Totals>("/api/pricing", {
      items: cart,
      coupon: code,
      method,
      email: customer.email,
      ...(quote && shippingId ? { quoteId: quote.id, shippingId } : {}),
    });
    setTotals(result);
    return result;
  }
  async function applyCoupon() {
    setError("");
    try {
      const result = await price(coupon);
      setAppliedCoupon(result.couponCode);
      sessionStorage.setItem("vn:coupon", result.couponCode);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function lookupCep() {
    const cep = digits(address.cep);
    if (cep.length !== 8) return;
    setAddressMessage("Consultando CEP…");
    try {
      const data = await api<Partial<Address>>(`/api/cep?cep=${cep}`);
      setAddress((a) => ({ ...a, ...data, cep }));
      setAddressMessage("Endereço localizado. Confira e informe o número.");
    } catch {
      setAddressMessage(
        "Consulta indisponível. Você pode preencher o endereço manualmente.",
      );
    }
  }
  function field(key: keyof Address, value: string) {
    setAddress((a) => ({ ...a, [key]: value }));
    setReview(false);
  }
  async function confirm(card?: CardToken, document?: string) {
    setError("");
    if (!quote || !shippingId) {
      setError("Calcule o frete e escolha a modalidade de entrega.");
      return;
    }
    if (quote.cep !== digits(address.cep)) {
      setError("O CEP do endereço deve ser o mesmo usado no cálculo do frete.");
      return;
    }
    if (!accepted) {
      setError("Leia e aceite os termos para continuar.");
      return;
    }
    setBusy(true);
    try {
      await price();
      track("add_payment_info", { currency: "BRL", payment_type: method });
      const base = {
        items: cart,
        customer: {
          ...customer,
          phone: digits(customer.phone),
          ...(document ? { document: digits(document) } : {}),
        },
        address: { ...address, cep: digits(address.cep) },
        quoteId: quote.id,
        shippingId,
        coupon: appliedCoupon,
        method,
      };
      const fingerprint = JSON.stringify(base);
      let attempt: {
        fingerprint: string;
        idempotencyKey: string;
        accessToken: string;
      } | null = null;
      try {
        attempt = JSON.parse(sessionStorage.getItem("vn:attempt") || "null");
      } catch {}
      if (!attempt || attempt.fingerprint !== fingerprint) {
        attempt = {
          fingerprint,
          idempotencyKey: crypto.randomUUID(),
          accessToken: randomToken(),
        };
        sessionStorage.setItem("vn:attempt", JSON.stringify(attempt));
      }
      const order = await api<OrderView>("/api/checkout", {
        ...base,
        idempotencyKey: attempt.idempotencyKey,
        accessToken: attempt.accessToken,
        ...(card ? { card } : {}),
      });
      sessionStorage.setItem(`vn:order:${order.id}`, attempt.accessToken);
      sessionStorage.removeItem("vn:attempt");
      sessionStorage.removeItem("vn:coupon");
      clear();
      router.push(`/pedido/${order.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      throw e;
    }
  }
  async function submit() {
    setError("");
    if (!quote || !shippingId) {
      setError("Calcule o frete e escolha a modalidade de entrega.");
      return;
    }
    if (quote.cep !== digits(address.cep)) {
      setError("Use o mesmo CEP no endereço e no cálculo do frete.");
      return;
    }
    try {
      await price();
      if (method === "card" && !catalog.demo) {
        setReview(true);
        return;
      }
      await confirm();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const subtotal = items.reduce((s, l) => s + l.price * l.quantity, 0);
  const shipping =
    quote?.options.find((o) => o.id === shippingId)?.priceCents || 0;
  const pixEstimate =
    method === "pix"
      ? Math.round(
          items.reduce(
            (s, l) =>
              s +
              (l.price *
                l.quantity *
                (l.product.pixPercent ?? catalog.settings.pixPercent)) /
                100,
            0,
          ),
        )
      : 0;
  const total = totals?.totalCents ?? subtotal + shipping - pixEstimate;
  if (!items.length)
    return (
      <div className="page">
        <Empty
          title="Sua sacola está vazia."
          description="Escolha uma peça para começar seu próximo fit."
        >
          <Link className="button" href="/produtos">
            VER A SELEÇÃO
          </Link>
        </Empty>
      </div>
    );
  return (
    <div className="page checkout-page">
      <nav className="breadcrumb" aria-label="Etapas da compra">
        <Link href="/sacola">Sacola</Link>
        <span>/</span>
        <span>Checkout</span>
      </nav>
      <p className="eyebrow">FALTA POUCO PARA O SEU PRÓXIMO FIT</p>
      <h1 className="page-title">DO SEU JEITO.</h1>
      {catalog.demo && (
        <p className="notice" style={{ marginBottom: 28 }}>
          MODO DEMONSTRAÇÃO — use dados de teste. Nenhuma cobrança ou entrega
          será realizada.
        </p>
      )}
      <div className="checkout-grid">
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <section className="checkout-section">
            <h2>
              <span className="step-number">01</span>SEUS DADOS
            </h2>
            <div className="form-grid">
              <Field label="Nome completo">
                <input
                  autoComplete="name"
                  required
                  minLength={3}
                  value={customer.name}
                  disabled={review}
                  onChange={(e) =>
                    setCustomer((c) => ({ ...c, name: e.target.value }))
                  }
                />
              </Field>
              <Field label="E-mail">
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={customer.email}
                  disabled={review}
                  onChange={(e) =>
                    setCustomer((c) => ({ ...c, email: e.target.value }))
                  }
                />
              </Field>
              <div className="span-2">
                <Field label="Celular com DDD">
                  <input
                    type="tel"
                    autoComplete="tel"
                    placeholder="(67) 99999-9999"
                    required
                    minLength={10}
                    maxLength={18}
                    value={customer.phone}
                    disabled={review}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, phone: e.target.value }))
                    }
                  />
                </Field>
              </div>
            </div>
          </section>
          <section className="checkout-section">
            <h2>
              <span className="step-number">02</span>ONDE VOCÊ RECEBE
            </h2>
            <div className="form-grid">
              <Field label="CEP">
                <input
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="00000-000"
                  required
                  pattern="[0-9]{5}-?[0-9]{3}"
                  maxLength={9}
                  value={address.cep}
                  disabled={review}
                  onChange={(e) => field("cep", e.target.value)}
                  onBlur={() => void lookupCep()}
                />
              </Field>
              <Field label="Número">
                <input
                  autoComplete="address-line2"
                  required
                  value={address.number}
                  disabled={review}
                  onChange={(e) => field("number", e.target.value)}
                />
              </Field>
              <div className="span-2">
                <Field label="Rua / Avenida">
                  <input
                    autoComplete="address-line1"
                    required
                    minLength={2}
                    value={address.street}
                    disabled={review}
                    onChange={(e) => field("street", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Complemento (opcional)">
                <input
                  value={address.complement}
                  disabled={review}
                  onChange={(e) => field("complement", e.target.value)}
                />
              </Field>
              <Field label="Bairro">
                <input
                  required
                  minLength={2}
                  value={address.district}
                  disabled={review}
                  onChange={(e) => field("district", e.target.value)}
                />
              </Field>
              <Field label="Cidade">
                <input
                  autoComplete="address-level2"
                  required
                  minLength={2}
                  value={address.city}
                  disabled={review}
                  onChange={(e) => field("city", e.target.value)}
                />
              </Field>
              <Field label="Estado">
                <select
                  autoComplete="address-level1"
                  required
                  value={address.state}
                  disabled={review}
                  onChange={(e) => field("state", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {[
                    "AC",
                    "AL",
                    "AP",
                    "AM",
                    "BA",
                    "CE",
                    "DF",
                    "ES",
                    "GO",
                    "MA",
                    "MT",
                    "MS",
                    "MG",
                    "PA",
                    "PB",
                    "PR",
                    "PE",
                    "PI",
                    "RJ",
                    "RN",
                    "RS",
                    "RO",
                    "RR",
                    "SC",
                    "SP",
                    "SE",
                    "TO",
                  ].map((uf) => (
                    <option key={uf}>{uf}</option>
                  ))}
                </select>
              </Field>
            </div>
            {addressMessage && (
              <p
                className="small muted"
                role="status"
                style={{ marginTop: 12 }}
              >
                {addressMessage}
              </p>
            )}
            <ShippingCalculator
              items={cart}
              onQuote={setQuote}
              selectedId={shippingId}
              onSelect={setShippingId}
            />
          </section>
          <section className="checkout-section">
            <h2>
              <span className="step-number">03</span>PAGAMENTO
            </h2>
            <div className="payment-options">
              <button
                type="button"
                className={method === "pix" ? "active" : ""}
                aria-pressed={method === "pix"}
                onClick={() => setMethod("pix")}
              >
                <ScanLine size={20} />
                Pix · {catalog.settings.pixPercent}% OFF
              </button>
              <button
                type="button"
                className={method === "card" ? "active" : ""}
                aria-pressed={method === "card"}
                onClick={() => setMethod("card")}
              >
                <CreditCard size={20} />
                Cartão
              </button>
            </div>
            {method === "pix" ? (
              <p className="small muted">
                {catalog.demo
                  ? "O pedido será criado aguardando pagamento. Você poderá simular a aprovação."
                  : "O QR Code e o código Pix serão exibidos após confirmar o pedido. Validade: 30 minutos."}
              </p>
            ) : (
              <p className="small muted">
                {catalog.demo
                  ? "Não informe dados de cartão. O pagamento é apenas uma simulação."
                  : "Após conferir seus dados, o Mercado Pago abre o formulário seguro. As opções de parcelamento aparecem no formulário."}
              </p>
            )}
            <label className="check-row small">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                required
              />
              Li e aceito os{" "}
              <Link
                className="text-link"
                href="/politicas/termos"
                target="_blank"
              >
                termos
              </Link>{" "}
              e a{" "}
              <Link
                className="text-link"
                href="/politicas/privacidade"
                target="_blank"
              >
                política de privacidade
              </Link>
              .
            </label>
            {error && (
              <p className="error" role="alert" style={{ marginBottom: 15 }}>
                {error}
              </p>
            )}
            {review && method === "card" && !catalog.demo ? (
              <>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setReview(false)}
                >
                  EDITAR DADOS
                </button>
                <CardPayment
                  amount={total}
                  email={customer.email}
                  onSubmit={confirm}
                />
              </>
            ) : (
              <button
                type="submit"
                className="button full"
                disabled={busy || !totals}
              >
                {busy
                  ? "CRIANDO SEU PEDIDO…"
                  : catalog.demo
                    ? "CRIAR PEDIDO DEMONSTRATIVO"
                    : method === "card"
                      ? "CONTINUAR PARA O CARTÃO"
                      : "CONFIRMAR PEDIDO E GERAR PIX"}
              </button>
            )}
            <p className="secure-note" style={{ marginTop: 16 }}>
              <ShieldCheck size={16} />
              Seus dados de cartão ficam com o Mercado Pago.
            </p>
          </section>
        </form>
        <aside className="order-summary">
          <h2>SEU FIT</h2>
          {items.map((l) => (
            <div className="order-mini" key={l.variantId}>
              <Image
                src={l.product.images[0]?.url || "/images/vn-logo.webp"}
                alt={l.product.name}
                width={62}
                height={70}
              />
              <div>
                <strong>{l.product.name}</strong>
                <p>
                  {l.variant.color} / {l.variant.size} · {l.quantity} un.
                </p>
              </div>
              <span>{money(l.price * l.quantity)}</span>
            </div>
          ))}
          <div className="coupon-form">
            <input
              aria-label="Cupom"
              placeholder="Cupom de desconto"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            />
            <button
              className="button button-outline"
              type="button"
              onClick={() => void applyCoupon()}
            >
              APLICAR
            </button>
          </div>
          {appliedCoupon && <p className="small">Cupom: {appliedCoupon}</p>}
          <div className="summary-line">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          {totals?.discountCents ? (
            <div className="summary-line">
              <span>Desconto do cupom</span>
              <span>− {money(totals.discountCents)}</span>
            </div>
          ) : null}
          {method === "pix" && (
            <div className="summary-line">
              <span>Desconto Pix</span>
              <span>− {money(totals?.pixDiscountCents ?? pixEstimate)}</span>
            </div>
          )}
          <div className="summary-line">
            <span>Entrega</span>
            <span>{quote ? money(shipping) : "A calcular"}</span>
          </div>
          <div className="summary-line total">
            <span>{quote ? "Total" : "Total sem frete"}</span>
            <strong>{money(total)}</strong>
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>
            Revise tamanho, cor e endereço antes de confirmar.
          </p>
        </aside>
      </div>
    </div>
  );
}
