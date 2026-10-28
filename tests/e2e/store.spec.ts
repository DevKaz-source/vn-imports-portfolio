import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
const product = "/produto/camiseta-heavyweight-preta";
async function rejectCookies(page: Page) {
  const reject = page.getByRole("button", { name: "REJEITAR OPCIONAIS" });
  if (await reject.isVisible()) await reject.click();
}
async function addToBag(page: Page) {
  await page.goto(product);
  await rejectCookies(page);
  await page.getByRole("button", { name: "P", exact: true }).click();
  await page
    .getByRole("button", { name: "ADICIONAR À SACOLA", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
async function audit(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
async function loadImages(page: Page) {
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    await document.fonts.ready;
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    await Promise.all(
      [...document.images].map((img) => img.decode().catch(() => {})),
    );
    window.scrollTo(0, 0);
  });
}
async function capture(page: Page, path: string, fullPage = true) {
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await page.screenshot({
    path,
    fullPage,
    ...(path.endsWith(".jpg") ? { quality: 85 } : {}),
  });
}
async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail administrativo").fill("qa@vn.test");
  await page
    .getByLabel("Senha", { exact: true })
    .fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "ENTRAR NO PAINEL" }).click();
  await expect(
    page.getByRole("heading", { name: "TUDO SOB CONTROLE." }),
  ).toBeVisible();
}
test("home desktop/mobile, imagens, acessibilidade e ausência de erros", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await rejectCookies(page);
  await loadImages(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /SEU ESTILO\.\s*SEM LIMITES\./,
  );
  expect(
    await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily),
  ).toMatch(/barlow/i);
  await audit(page);
  await mkdir("docs", { recursive: true });
  await capture(page, "docs/home-desktop.jpg", false);
  await capture(page, "docs/preview-desktop.png", false);
  await page.setViewportSize({ width: 390, height: 844 });
  await loadImages(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByRole("link", { name: "TODAS AS PEÇAS" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await audit(page);
  await capture(page, "docs/home-mobile.png");
  await capture(page, "docs/preview-mobile.png", false);
  expect(errors).toEqual([]);
});
test("produto: estoque esgotado, guia, zoom, favoritos persistentes e busca", async ({
  page,
}) => {
  await page.goto(product);
  await rejectCookies(page);
  await expect(
    page.getByRole("button", { name: "M indisponível", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Guia de tamanhos" }).click();
  await expect(page.getByRole("dialog").getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .getByRole("button", { name: "Ampliar imagem de Camiseta Heavyweight" })
    .click();
  await expect(page.getByRole("dialog").getByRole("img")).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Salvar nos favoritos" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Salvar nos favoritos" }),
  ).toHaveAttribute("aria-pressed", "true");
  await audit(page);
  await capture(page, "docs/produto.png");
  await page.goto("/favoritos");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.goto("/produtos");
  await page
    .getByRole("textbox", { name: "Buscar peças no catálogo" })
    .fill("cargo");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-name")).toHaveText("Calça Cargo Utility");
  await page.getByLabel("Ordenar produtos").selectOption("menor");
  await expect(page).toHaveURL(/ordem=menor/);
});
test("sacola: quantidade, persistência, frete inválido e remoção", async ({
  page,
}) => {
  await addToBag(page);
  await page
    .getByRole("button", {
      name: "Aumentar quantidade de Camiseta Heavyweight",
    })
    .click();
  await page.getByRole("link", { name: "VER SACOLA COMPLETA" }).click();
  await page.reload();
  await expect(page.locator(".quantity span")).toHaveText("2");
  await page.getByLabel("CEP para calcular frete").fill("123");
  await page.getByRole("button", { name: "CALCULAR", exact: true }).click();
  await expect(
    page.getByText("Informe um CEP com 8 números.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remover Camiseta Heavyweight", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ainda falta o seu toque." }),
  ).toBeVisible();
});
test("checkout sem conta: cupom, frete, pedido, aprovação e acesso privado", async ({
  page,
  request,
}) => {
  await addToBag(page);
  await page.getByRole("link", { name: "CONTINUAR PARA O CHECKOUT" }).click();
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Cliente de Teste");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("cliente-qa@example.com");
  await page.getByLabel("Celular com DDD").fill("67999999999");
  await page.route("**/api/cep?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"Manual test"}',
    }),
  );
  await page.getByLabel("CEP", { exact: true }).fill("79002-000");
  await page.getByLabel("Número", { exact: true }).fill("123");
  await page.getByLabel("Rua / Avenida", { exact: true }).fill("Rua de Teste");
  await page.getByLabel("Bairro", { exact: true }).fill("Centro");
  await page.getByLabel("Cidade", { exact: true }).fill("Campo Grande");
  await page.getByLabel("Estado", { exact: true }).selectOption("MS");
  await page.getByLabel("CEP para calcular frete").fill("79002000");
  await page.getByRole("button", { name: "CALCULAR", exact: true }).click();
  await expect(page.locator(".shipping-options")).toBeVisible();
  await page.getByLabel("Cupom", { exact: true }).fill("VNDEMO10");
  await page.getByRole("button", { name: "APLICAR" }).click();
  await expect(
    page.getByText("Cupom: VNDEMO10", { exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: /Li e aceito/ }).check();
  await audit(page);
  await capture(page, "docs/checkout.png");
  await page
    .getByRole("button", { name: "CRIAR PEDIDO DEMONSTRATIVO" })
    .click();
  await expect(page).toHaveURL(/\/pedido\//);
  await expect(
    page.getByRole("heading", { name: "Aguardando pagamento" }),
  ).toBeVisible();
  const id = page.url().split("/").at(-1);
  expect((await request.get(`/api/orders/${id}`)).status()).toBe(404);
  await page
    .getByRole("button", { name: "SIMULAR PAGAMENTO APROVADO" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pagamento aprovado", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pagamento aprovado", exact: true }),
  ).toBeVisible();
  await capture(page, "docs/pedido.png");
});
test("admin protegido, login, upload, edição de produto e histórico de estoque", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/admin/state")).status()).toBe(401);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await login(page);
  await audit(page);
  await capture(page, "docs/admin.png");
  await page.getByRole("button", { name: "Produtos", exact: true }).click();
  await page
    .getByRole("button", { name: "Camiseta Heavyweight", exact: false })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Nome da peça", { exact: true })
    .fill("Camiseta Heavyweight QA");
  await dialog.getByRole("tab", { name: "Fotos", exact: true }).click();
  await dialog
    .getByLabel("Enviar imagens")
    .setInputFiles("public/images/tee-black.webp");
  await expect(dialog.getByLabel("Descrição da foto 2")).toBeVisible();
  await dialog
    .getByLabel("Descrição da foto 2")
    .fill("Camiseta preta: foto adicional de teste");
  await dialog.getByRole("button", { name: "SALVAR PEÇA" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Estoque", exact: true }).click();
  await page
    .getByRole("button", { name: "AJUSTAR", exact: true })
    .first()
    .click();
  await dialog.getByLabel("Quantidade do ajuste").fill("3");
  await dialog.getByLabel("Motivo do ajuste").fill("Reposição de teste E2E");
  await dialog.getByRole("button", { name: "CONFIRMAR AJUSTE" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("cell", { name: /Reposição de teste E2E/ }),
  ).toBeVisible();
  const forged = await page.request.post("/api/admin/inventory", {
    headers: { Origin: "https://evil.example" },
    data: { variantId: "test", delta: 1, reason: "Forged request" },
  });
  expect(forged.status()).toBe(403);
  await page.goto(product);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Camiseta Heavyweight QA",
  );
});
