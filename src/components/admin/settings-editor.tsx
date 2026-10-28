"use client";
import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import type { StoreSettings } from "@/domain/types";
import { Field } from "@/components/ui";
import { ImageManager } from "./image-manager";
import { api } from "@/lib/utils";
export function SettingsEditor({
  settings,
  onSaved,
}: {
  settings: StoreSettings;
  onSaved: () => Promise<void>;
}) {
  const [s, setS] = useState(settings);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  function set<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setS((s) => ({ ...s, [key]: value }));
  }
  async function save() {
    setBusy(true);
    setStatus("");
    try {
      await api("/api/admin/settings", s);
      await onSaved();
      setStatus("Configurações salvas.");
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const input = (key: keyof StoreSettings, label: string, type = "text") => (
    <Field key={key} label={label}>
      <input
        type={type}
        value={String(s[key] ?? "")}
        onChange={(e) => set(key, e.target.value as never)}
      />
    </Field>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="admin-panel"
    >
      <Tabs.Root defaultValue="brand">
        <Tabs.List className="admin-tabs" aria-label="Configurações da loja">
          <Tabs.Trigger value="brand">Marca e contato</Tabs.Trigger>
          <Tabs.Trigger value="shipping">Frete e preços</Tabs.Trigger>
          <Tabs.Trigger value="business">Dados comerciais</Tabs.Trigger>
          <Tabs.Trigger value="policies">Políticas</Tabs.Trigger>
          <Tabs.Trigger value="seo">SEO e analytics</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="brand" className="tab-content">
          <div className="form-grid">
            {input("name", "Nome da loja")}
            {input("announcement", "Mensagem da barra superior")}
            {input("instagram", "Link do Instagram", "url")}
            {input("whatsapp", "WhatsApp com país + DDD (ex.: 5567999999999)")}
            {input("email", "E-mail de atendimento", "email")}
            {input("serviceHours", "Horário de atendimento")}
          </div>
          <h3 className="admin-subheading">LOGO</h3>
          <ImageManager
            multiple={false}
            images={s.logo ? [{ id: "logo", url: s.logo, alt: s.name }] : []}
            onChange={(images) => set("logo", images[0]?.url || "")}
          />
          <h3 className="admin-subheading">FAVICON</h3>
          <ImageManager
            multiple={false}
            images={
              s.favicon
                ? [{ id: "favicon", url: s.favicon, alt: "Ícone da loja" }]
                : []
            }
            onChange={(images) => set("favicon", images[0]?.url || "")}
          />
        </Tabs.Content>
        <Tabs.Content value="shipping" className="tab-content">
          <div className="form-grid">
            {input("originCep", "CEP de origem (8 números)")}
            <Field
              label="Frete grátis a partir de (R$)"
              hint="0 desativa. Aplica ao serviço de menor preço."
            >
              <input
                type="number"
                min="0"
                step="0.01"
                value={s.freeShippingFromCents / 100}
                onChange={(e) =>
                  set(
                    "freeShippingFromCents",
                    Math.round(Number(e.target.value) * 100),
                  )
                }
              />
            </Field>
            <Field label="Desconto Pix padrão (%)">
              <input
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={s.pixPercent}
                onChange={(e) => set("pixPercent", Number(e.target.value))}
              />
            </Field>
            <Field label="Dias úteis de separação">
              <input
                type="number"
                min="0"
                max="30"
                value={s.preparationDays}
                onChange={(e) => set("preparationDays", Number(e.target.value))}
              />
            </Field>
            {input(
              "shippingServices",
              "Serviços Melhor Envio (IDs separados por vírgula)",
            )}
            {input("pickupName", "Nome / endereço do ponto de retirada")}
            <label className="check-row">
              <input
                type="checkbox"
                checked={s.pickupEnabled}
                onChange={(e) => set("pickupEnabled", e.target.checked)}
              />
              Permitir retirada local
            </label>
          </div>
          <p className="notice" style={{ marginTop: 20 }}>
            Tokens dos provedores são configurados nas variáveis de ambiente do
            servidor e não aparecem no painel.
          </p>
        </Tabs.Content>
        <Tabs.Content value="business" className="tab-content">
          <p className="notice" style={{ marginBottom: 20 }}>
            Preencha os dados reais da operação. Não publique informações
            fictícias.
          </p>
          <div className="form-grid">
            {input("businessName", "Razão social / nome empresarial")}
            {input("businessDocument", "CNPJ / documento comercial")}
            <div className="span-2">
              {input("businessAddress", "Endereço comercial completo")}
            </div>
          </div>
        </Tabs.Content>
        <Tabs.Content value="policies" className="tab-content">
          {[
            ["privacidade", "Política de Privacidade"],
            ["cookies", "Política de Cookies"],
            ["termos", "Termos de Uso"],
            ["trocas", "Trocas e Devoluções"],
            ["entregas", "Política de Entrega"],
          ].map(([key, label]) => (
            <div key={key} style={{ marginBottom: 22 }}>
              <Field label={label}>
                <textarea
                  rows={7}
                  value={s.policies[key] || ""}
                  onChange={(e) =>
                    set("policies", { ...s.policies, [key]: e.target.value })
                  }
                />
              </Field>
            </div>
          ))}
          <label className="check-row">
            <input
              type="checkbox"
              checked={s.policiesReviewed}
              onChange={(e) => set("policiesReviewed", e.target.checked)}
            />
            Revisei as políticas e os dados comerciais para a operação real.
          </label>
        </Tabs.Content>
        <Tabs.Content value="seo" className="tab-content">
          <div className="form-grid">
            <div className="span-2">{input("seoTitle", "Título padrão")}</div>
            <div className="span-2">
              <Field label="Descrição padrão">
                <textarea
                  maxLength={180}
                  value={s.seoDescription}
                  onChange={(e) => set("seoDescription", e.target.value)}
                />
              </Field>
            </div>
            {input("gaId", "Google Analytics 4 (G-XXXXXXXXXX)")}
            {input("metaPixelId", "ID do Meta Pixel")}
          </div>
          <p className="notice" style={{ marginTop: 20 }}>
            As ferramentas de análise e publicidade só são carregadas depois do
            consentimento correspondente.
          </p>
        </Tabs.Content>
      </Tabs.Root>
      {status && (
        <p
          className={status === "Configurações salvas." ? "success" : "error"}
          role="status"
        >
          {status}
        </p>
      )}
      <div className="editor-footer">
        <button className="button" disabled={busy}>
          {busy ? "SALVANDO…" : "SALVAR CONFIGURAÇÕES"}
        </button>
      </div>
    </form>
  );
}
