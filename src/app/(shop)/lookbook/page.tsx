import Image from "next/image";
import { getCatalog } from "@/server/repository";
import { ProductCard } from "@/components/product-card";
export const metadata = { title: "Lookbook | Compre o look" };
export default async function Page() {
  const { looks, products } = await getCatalog();
  return (
    <div className="page">
      <p className="eyebrow">THE FIT / SELECTED BY VN</p>
      <h1 className="page-title">VISTA SUA IDENTIDADE.</h1>
      <p className="page-intro">
        Um look, várias possibilidades. Escolha cada peça e encontre seu
        tamanho.
      </p>
      {looks.map((l) => (
        <section className="lookbook-row" key={l.id}>
          <Image
            className="lookbook-image"
            src={l.image}
            alt={l.name}
            width={1000}
            height={1333}
            priority
          />
          <div>
            <p className="eyebrow">COMPRE O LOOK</p>
            <h2>{l.name}</h2>
            <div className="lookbook-products">
              {l.productIds.map((id) => {
                const p = products.find((p) => p.id === id);
                return p ? <ProductCard key={id} product={p} /> : null;
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
