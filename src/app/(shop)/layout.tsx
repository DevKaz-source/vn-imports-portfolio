import { StoreProvider } from "@/components/store-provider";
import { Header, Footer, CartDrawer } from "@/components/store-shell";
import { getCatalog } from "@/server/repository";
import type { Metadata } from "next";
import { StoreTools } from "@/components/webmcp";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { settings, demo } = await getCatalog();
  return {
    icons: settings.favicon ? { icon: settings.favicon } : undefined,
    robots: demo ? { index: false, follow: false } : undefined,
  };
}
export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const catalog = await getCatalog();
  return (
    <StoreProvider catalog={catalog}>
      <StoreTools />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CartDrawer />
    </StoreProvider>
  );
}
