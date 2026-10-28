"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import type { CardToken } from "@/integrations/payments";
type FormData = {
  token: string;
  payment_method_id: string;
  installments: number;
  issuer_id?: string;
  payer: { email: string; identification?: { number: string; type: string } };
};
type Controller = { unmount: () => Promise<void> };
type BrickOptions = {
  initialization: { amount: number; payer: { email: string } };
  customization: {
    visual: { style: { theme: string } };
    paymentMethods: { maxInstallments: number };
  };
  callbacks: {
    onReady: () => void;
    onError: () => void;
    onSubmit: (form: FormData) => Promise<void>;
  };
};
declare global {
  interface Window {
    MercadoPago?: new (
      key: string,
      options: { locale: string },
    ) => {
      bricks: () => {
        create: (
          type: string,
          id: string,
          options: BrickOptions,
        ) => Promise<Controller>;
      };
    };
  }
}
export function CardPayment({
  amount,
  email,
  onSubmit,
}: {
  amount: number;
  email: string;
  onSubmit: (card: CardToken, document?: string) => Promise<void>;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const submit = useRef(onSubmit);
  useEffect(() => {
    submit.current = onSubmit;
  }, [onSubmit]);
  useEffect(() => {
    if (!ready || !window.MercadoPago) return;
    let controller: Controller | undefined;
    let cancelled = false;
    const mp = new window.MercadoPago(
      process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY!,
      { locale: "pt-BR" },
    );
    mp.bricks()
      .create("cardPayment", "vn-card-payment", {
        initialization: { amount: amount / 100, payer: { email } },
        customization: {
          visual: { style: { theme: "default" } },
          paymentMethods: { maxInstallments: 12 },
        },
        callbacks: {
          onReady: () => setLoading(false),
          onError: () => {
            setLoading(false);
            setError(
              "O formulário seguro não carregou. Tente novamente ou escolha Pix.",
            );
          },
          onSubmit: async (data) => {
            await submit.current(
              {
                token: data.token,
                paymentMethodId: data.payment_method_id,
                installments: data.installments,
                issuerId: String(data.issuer_id || ""),
              },
              data.payer.identification?.number,
            );
          },
        },
      })
      .then((c) => {
        if (cancelled) void c.unmount();
        else controller = c;
      })
      .catch(() => setError("Formulário indisponível."));
    return () => {
      cancelled = true;
      void controller?.unmount();
    };
  }, [ready, amount, email]);
  return (
    <>
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        onReady={() => setReady(true)}
        onError={() => {
          setLoading(false);
          setError("Não foi possível carregar o Mercado Pago.");
        }}
      />
      {loading && !error && (
        <p className="notice">Carregando formulário seguro do Mercado Pago…</p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div id="vn-card-payment" />
    </>
  );
}
