import { Suspense } from "react";
import { CatalogView } from "@/components/catalog";
export const metadata = {
  title: "Todas as peças",
  description:
    "Explore camisetas, calças, moletons, sneakers e acessórios. Encontre seu próximo fit.",
};
export default function Page() {
  return (
    <Suspense>
      <CatalogView />
    </Suspense>
  );
}
