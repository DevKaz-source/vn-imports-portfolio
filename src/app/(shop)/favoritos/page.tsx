import { Suspense } from "react";
import { CatalogView } from "@/components/catalog";
export const metadata = { title: "Meus favoritos", robots: { index: false } };
export default function Page() {
  return (
    <Suspense>
      <CatalogView wishlist />
    </Suspense>
  );
}
