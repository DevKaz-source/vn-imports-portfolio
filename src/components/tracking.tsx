"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import { useStore } from "./store-provider";
import { Modal } from "./ui";
type Consent = { analytics: boolean; marketing: boolean; at: string };
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & {
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
      push?: unknown;
      callMethod?: (...args: unknown[]) => void;
    };
  }
}
export function track(name: string, params: Record<string, unknown> = {}) {
  try {
    const c = JSON.parse(localStorage.getItem("vn:consent") || "{}");
    let sent = false;
    if (c.analytics && window.gtag) {
      window.gtag("event", name, params);
      sent = true;
    }
    if (c.marketing && window.fbq) {
      const standard: Record<string, string> = {
        view_item: "ViewContent",
        add_to_cart: "AddToCart",
        begin_checkout: "InitiateCheckout",
        add_payment_info: "AddPaymentInfo",
        purchase: "Purchase",
        search: "Search",
      };
      window.fbq(
        standard[name] ? "track" : "trackCustom",
        standard[name] || name,
        params,
      );
      sent = true;
    }
    return sent;
  } catch {
    return false;
  }
}
export function CookiePreferences({
  forceOpen,
  onClose,
}: {
  forceOpen: boolean;
  onClose: () => void;
}) {
  const { catalog } = useStore();
  const [consent, setConsent] = useState<Consent | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("vn:consent") || "null",
      ) as Consent | null;
      setConsent(saved);
      setAnalytics(saved?.analytics ?? false);
      setMarketing(saved?.marketing ?? false);
    } catch {}
    setLoaded(true);
  }, []);
  function save(a: boolean, m: boolean) {
    const next = { analytics: a, marketing: m, at: new Date().toISOString() };
    setConsent(next);
    setAnalytics(a);
    setMarketing(m);
    localStorage.setItem("vn:consent", JSON.stringify(next));
    setPreferences(false);
    onClose();
    if (catalog.settings.gaId)
      (window as unknown as Record<string, unknown>)[
        `ga-disable-${catalog.settings.gaId}`
      ] = !a;
    window.fbq?.("consent", m ? "grant" : "revoke");
  }
  return (
    <>
      {loaded && !consent && !forceOpen && !preferences && (
        <aside
          className="cookie-banner"
          aria-label="Suas preferências de cookies"
        >
          <div>
            <strong>Seu espaço. Suas escolhas.</strong>
            <p>
              Usamos cookies para a sacola e, com sua permissão, para entender
              as visitas e personalizar anúncios.
            </p>
          </div>
          <div className="cookie-actions">
            <button onClick={() => setPreferences(true)}>CONFIGURAR</button>
            <button onClick={() => save(false, false)}>
              REJEITAR OPCIONAIS
            </button>
            <button className="button" onClick={() => save(true, true)}>
              ACEITAR
            </button>
          </div>
        </aside>
      )}
      <Modal
        open={preferences || forceOpen}
        onOpenChange={(v) => {
          setPreferences(v);
          if (!v) onClose();
        }}
        title="PREFERÊNCIAS DE COOKIES"
      >
        <p className="muted">
          Os necessários mantêm a sacola e suas escolhas. Os opcionais ficam
          desligados até você permitir.
        </p>
        <label className="check-row">
          <input type="checkbox" checked disabled />
          Necessários (sempre ativos)
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={analytics}
            onChange={(e) => setAnalytics(e.target.checked)}
          />
          Análise de visitas
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
          />
          Publicidade
        </label>
        <button
          className="button full"
          onClick={() => save(analytics, marketing)}
        >
          SALVAR MINHAS ESCOLHAS
        </button>
      </Modal>
      {consent?.analytics && catalog.settings.gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${catalog.settings.gaId}`}
            strategy="afterInteractive"
          />
          <Script
            id="vn-ga"
            strategy="afterInteractive"
          >{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${catalog.settings.gaId}',{anonymize_ip:true});`}</Script>
        </>
      )}
      {consent?.marketing && catalog.settings.metaPixelId && (
        <Script
          id="vn-meta"
          strategy="afterInteractive"
        >{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};n.queue=[];n.loaded=!0;n.version='2.0';t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${catalog.settings.metaPixelId}');fbq('track','PageView');`}</Script>
      )}
    </>
  );
}
