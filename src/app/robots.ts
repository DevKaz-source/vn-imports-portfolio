import type { MetadataRoute } from "next";
import { isDemo, siteUrl } from "@/server/config";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: isDemo() ? undefined : "/",
      disallow: isDemo()
        ? "/"
        : ["/admin", "/api", "/checkout", "/sacola", "/pedido", "/favoritos"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
