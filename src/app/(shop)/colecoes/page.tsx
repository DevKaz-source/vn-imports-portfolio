import Link from "next/link";
import Image from "next/image";
import { getCatalog } from "@/server/repository";
export const metadata = { title: "Drops e coleções" };
export default async function Page() {
  const { collections } = await getCatalog();
  return (
    <div className="page">
      <p className="eyebrow">CAPÍTULOS DA VN</p>
      <h1 className="page-title">OS DROPS.</h1>
      <p className="page-intro">
        Cada seleção, uma nova forma de se expressar.
      </p>
      <div className="collection-grid">
        {collections.map((c) => (
          <Link
            key={c.id}
            className="collection-card"
            href={`/colecoes/${c.slug}`}
          >
            <Image
              src={c.image || "/images/vn-logo.webp"}
              alt={c.name}
              width={1000}
              height={700}
            />
            <h2>{c.name}</h2>
            <p>{c.description}</p>
            {c.startsAt && (
              <p>
                Disponível a partir de{" "}
                {new Date(c.startsAt).toLocaleDateString("pt-BR", {
                  timeZone: "America/Campo_Grande",
                })}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
