"use client";
import { useEffect, useRef } from "react";
import { useStore } from "./store-provider";
type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
};
type ModelContext = {
  registerTool: (
    tool: Tool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function StoreTools() {
  const store = useStore();
  const latest = useRef(store);
  useEffect(() => {
    latest.current = store;
  }, [store]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools: Tool[] = [
      {
        name: "vn_search_catalog",
        title: "Consultar catálogo VN",
        description:
          "Consulta peças, preços em centavos e disponibilidade das variações. Não cria pedido nem altera a sacola.",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string", maxLength: 120 } },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute(input) {
          if (
            !input ||
            typeof input !== "object" ||
            Object.keys(input).some((k) => k !== "query")
          )
            throw new Error("Consulta inválida.");
          const query = (input as { query?: unknown }).query;
          if (
            query !== undefined &&
            (typeof query !== "string" || query.length > 120)
          )
            throw new Error("Consulta inválida.");
          return latest.current.catalog.products
            .filter(
              (p) =>
                !query ||
                p.name.toLowerCase().includes(String(query).toLowerCase()),
            )
            .map((p) => ({
              id: p.id,
              name: p.name,
              url: `/produto/${p.slug}`,
              priceCents: p.priceCents,
              demo: p.demo,
              variants: p.variants.map((v) => ({
                id: v.id,
                size: v.size,
                color: v.color,
                available: v.active ? v.stock : 0,
              })),
            }));
        },
      },
      {
        name: "vn_read_bag",
        title: "Consultar sacola VN",
        description:
          "Consulta os IDs e quantidades presentes na sacola deste navegador. Não confirma compra.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute(input) {
          if (!input || typeof input !== "object" || Object.keys(input).length)
            throw new Error("Entrada inválida.");
          return { items: latest.current.cart };
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => lifecycle.abort();
  }, []);
  return null;
}
