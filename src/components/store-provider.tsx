"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Catalog, CartLine, Product, Variant } from "@/domain/types";
import { track } from "./tracking";
import { priceOf } from "@/domain/commerce";
type StoreContextValue = {
  catalog: Catalog;
  cart: CartLine[];
  favorites: string[];
  recent: string[];
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  add: (p: Product, v: Variant, quantity?: number) => boolean;
  quantity: (id: string, n: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  toggleFavorite: (id: string) => void;
  view: (id: string) => void;
  notify: (s: string) => void;
};
const Context = createContext<StoreContextValue | null>(null);
function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function StoreProvider({
  catalog,
  children,
}: {
  catalog: Catalog;
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const stored = readLocal<unknown>("vn:cart", []);
    setCart(
      Array.isArray(stored)
        ? stored.filter(
            (l: CartLine) =>
              typeof l?.productId === "string" &&
              typeof l.variantId === "string" &&
              Number.isInteger(l.quantity) &&
              l.quantity > 0 &&
              l.quantity <= 20,
          )
        : [],
    );
    const f = readLocal<unknown>("vn:favorites", []);
    setFavorites(
      Array.isArray(f) ? f.filter((v) => typeof v === "string") : [],
    );
    const r = readLocal<unknown>("vn:recent", []);
    setRecent(Array.isArray(r) ? r.filter((v) => typeof v === "string") : []);
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem("vn:cart", JSON.stringify(cart));
        localStorage.setItem("vn:favorites", JSON.stringify(favorites));
        localStorage.setItem("vn:recent", JSON.stringify(recent));
      } catch {
        /* Storage can be unavailable in private browsing. */
      }
    }
  }, [cart, favorites, recent, ready]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  function add(p: Product, v: Variant, n = 1) {
    const old = cart.find((l) => l.variantId === v.id)?.quantity ?? 0;
    if (!v.active || old + n > v.stock) {
      setToast("Essa quantidade não está disponível.");
      return false;
    }
    setCart((items) => [
      ...items.filter((l) => l.variantId !== v.id),
      { productId: p.id, variantId: v.id, quantity: old + n },
    ]);
    setCartOpen(true);
    return true;
  }
  function quantity(id: string, n: number) {
    const v = catalog.products
      .flatMap((p) => p.variants)
      .find((v) => v.id === id);
    if (n < 1) {
      setCart((items) => items.filter((l) => l.variantId !== id));
      return;
    }
    if (!v || n > v.stock || n > 20) {
      setToast("Limite de estoque disponível.");
      return;
    }
    setCart((items) =>
      items.map((l) => (l.variantId === id ? { ...l, quantity: n } : l)),
    );
  }
  function remove(id: string) {
    const line = cart.find((l) => l.variantId === id);
    if (line)
      track("remove_from_cart", {
        items: [
          {
            item_id: line.productId,
            item_variant: id,
            quantity: line.quantity,
          },
        ],
      });
    setCart((c) => c.filter((l) => l.variantId !== id));
  }
  const view = useCallback(
    (id: string) =>
      setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 8)),
    [],
  );
  return (
    <Context.Provider
      value={{
        catalog,
        cart,
        favorites,
        recent,
        cartOpen,
        setCartOpen,
        add,
        quantity,
        remove,
        clear: () => setCart([]),
        toggleFavorite: (id) =>
          setFavorites((f) =>
            f.includes(id) ? f.filter((x) => x !== id) : [...f, id],
          ),
        view,
        notify: setToast,
      }}
    >
      {children}
      <div
        aria-live="polite"
        role="status"
        className={toast ? "toast" : "sr-only"}
      >
        {toast}
      </div>
    </Context.Provider>
  );
}
export const useStore = () => {
  const v = useContext(Context);
  if (!v) throw new Error("StoreProvider ausente");
  return v;
};
export function useCartItems() {
  const { cart, catalog } = useStore();
  return cart.flatMap((l) => {
    const p = catalog.products.find((p) => p.id === l.productId);
    const v = p?.variants.find((v) => v.id === l.variantId);
    return p && v
      ? [{ ...l, product: p, variant: v, price: priceOf(p, v.id) }]
      : [];
  });
}
