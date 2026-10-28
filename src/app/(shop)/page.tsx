import type { Metadata } from "next";
import { Home } from "@/components/home";
import { getCatalog } from "@/server/repository";
import { siteUrl } from "@/server/config";
export async function generateMetadata(): Promise<Metadata> {
  const { settings: s, demo } = await getCatalog();
  return {
    title: { absolute: s.seoTitle },
    description: s.seoDescription,
    alternates: { canonical: "/" },
    robots: demo ? { index: false, follow: false } : undefined,
    openGraph: {
      title: s.seoTitle,
      description: s.seoDescription,
      url: siteUrl(),
      type: "website",
      images: [
        {
          url: new URL(s.logo || "/images/vn-logo.webp", siteUrl()).href,
          alt: s.name,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: s.seoTitle,
      description: s.seoDescription,
    },
  };
}
export default async function Page() {
  const { settings: s, demo } = await getCatalog();
  return (
    <>
      {!demo && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${siteUrl()}/#organization`,
                  name: s.name,
                  url: siteUrl(),
                  logo: new URL(s.logo || "/images/vn-logo.webp", siteUrl())
                    .href,
                  sameAs: [s.instagram],
                },
                {
                  "@type": "WebSite",
                  "@id": `${siteUrl()}/#website`,
                  name: s.name,
                  url: siteUrl(),
                  inLanguage: "pt-BR",
                  publisher: { "@id": `${siteUrl()}/#organization` },
                },
              ],
            }).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <Home />
    </>
  );
}
