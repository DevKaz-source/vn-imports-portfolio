// Portfolio edition: environment variables cannot enable real sales.
export const isDemo = () => true;
export function assertConfig() {
  if (process.env.STORE_MODE && process.env.STORE_MODE !== "demo")
    throw new Error("Esta edição de portfólio aceita somente STORE_MODE=demo.");
  if (process.env.VERCEL)
    throw new Error(
      "A edição de portfólio usa arquivos locais e não deve ser implantada na Vercel.",
    );
}
export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
