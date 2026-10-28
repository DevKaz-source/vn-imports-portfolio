import { afterEach, describe, expect, it, vi } from "vitest";
import { assertConfig, isDemo } from "@/server/config";
import { GET as lookupCep } from "@/app/api/cep/route";
import { POST as paymentWebhook } from "@/app/api/webhooks/mercadopago/route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Proteções da edição de portfólio", () => {
  it("recusa modo live e mantém os adaptadores demonstrativos", () => {
    vi.stubEnv("STORE_MODE", "live");
    vi.stubEnv("CHECKOUT_ENABLED", "true");
    expect(isDemo()).toBe(true);
    expect(() => assertConfig()).toThrow("somente STORE_MODE=demo");
  });
  it("recusa hospedagem Vercel com arquivos locais", () => {
    vi.stubEnv("STORE_MODE", "demo");
    vi.stubEnv("VERCEL", "1");
    expect(() => assertConfig()).toThrow("arquivos locais");
  });
  it("não transmite o CEP para serviços externos", async () => {
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const response = await lookupCep(
      new Request("http://localhost:3000/api/cep?cep=79002000"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      street: "",
      district: "",
      city: "",
      state: "",
    });
    expect(network).not.toHaveBeenCalled();
  });
  it("bloqueia webhook comercial mesmo com ambiente live", async () => {
    vi.stubEnv("STORE_MODE", "live");
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const response = await paymentWebhook(
      new Request("http://localhost:3000/api/webhooks/mercadopago", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(404);
    expect(network).not.toHaveBeenCalled();
  });
});
