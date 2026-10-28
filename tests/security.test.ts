import { beforeEach, describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import sharp from "sharp";
import {
  assertOrigin,
  signSession,
  verifySession,
  verifyWebhookSignature,
} from "@/server/security";
import { processImage } from "@/server/upload";
beforeEach(() => {
  process.env.SESSION_SECRET = "a".repeat(64);
  process.env.DEMO_ADMIN_EMAIL = "admin@vn.local";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
});
describe("Autenticação e segurança", () => {
  it("valida sessão assinada e rejeita sessão adulterada", () => {
    const token = signSession("admin@vn.local");
    expect(verifySession(token)).toBe("admin@vn.local");
    expect(verifySession(token + "0")).toBeNull();
    expect(verifySession(signSession("outsider@vn.local"))).toBeNull();
  });
  it("bloqueia origem externa e cabeçalho ausente", () => {
    expect(() =>
      assertOrigin(
        new Request("http://localhost:3000/api", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toThrow();
    expect(() =>
      assertOrigin(new Request("http://localhost:3000/api")),
    ).toThrow();
    expect(() =>
      assertOrigin(
        new Request("http://localhost:3000/api", {
          headers: { origin: "http://localhost:3000" },
        }),
      ),
    ).not.toThrow();
  });
  it("aceita webhook assinado e rejeita adulteração e replay antigo", () => {
    const ts = String(Date.now());
    const secret = "webhook-secret";
    const id = "ORD123ABC";
    const requestId = "req-123";
    const h = createHmac("sha256", secret)
      .update(`id:${id.toLowerCase()};request-id:${requestId};ts:${ts};`)
      .digest("hex");
    const signature = `ts=${ts},v1=${h}`;
    expect(verifyWebhookSignature(id, requestId, signature, secret)).toBe(true);
    expect(
      verifyWebhookSignature("ORDEVIL", requestId, signature, secret),
    ).toBe(false);
    expect(
      verifyWebhookSignature(
        id,
        requestId,
        signature,
        secret,
        Date.now() + 3600000,
      ),
    ).toBe(false);
  });
  it("rejeita imagem inválida, SVG e payload acima de 8 MB", async () => {
    await expect(
      processImage(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        ),
      ),
    ).rejects.toThrow(/imagem/i);
    await expect(processImage(Buffer.from("invalid-image"))).rejects.toThrow(
      "inválida",
    );
    await expect(processImage(Buffer.alloc(9 * 1024 * 1024))).rejects.toThrow(
      "8 MB",
    );
  });
  it("reencoda uploads válidos para WebP e limita dimensões", async () => {
    const input = await sharp({
      create: { width: 2200, height: 20, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    const output = await processImage(input);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(2000);
  });
});
