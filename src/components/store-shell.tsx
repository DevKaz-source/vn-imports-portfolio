"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  Heart,
  ShoppingBag,
  Menu,
  Instagram,
  MessageCircle,
  Plus,
  Minus,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { useCartItems, useStore } from "./store-provider";
import { Modal } from "./ui";
import { money, whatsappUrl } from "@/domain/commerce";
import { CookiePreferences } from "./tracking";
export function Header() {
  const { catalog, cart, favorites, setCartOpen } = useStore();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [term, setTerm] = useState("");
  const router = useRouter();
  return (
    <>
      <a href="#main" className="skip-link">
        Pular para o conteúdo
      </a>
      <div className="announcement">
        <span>{catalog.settings.announcement}</span>
        {catalog.demo && (
          <span className="demo-label">PORTFÓLIO · SEM COBRANÇAS</span>
        )}
      </div>
      <header className="header">
        <div className="header-inner">
          <button
            className="icon-button mobile-only"
            onClick={() => setMenu(true)}
            aria-label="Abrir menu"
          >
            <Menu />
          </button>
          <Link className="brand" href="/" aria-label="VN Imports, início">
            <Image
              src={catalog.settings.logo || "/images/vn-logo.webp"}
              width={52}
              height={52}
              alt="Logo original VN Imports"
            />
            <span>
              VN <b>IMPORTS</b>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Menu principal">
            <Link href="/produtos?novidades=1">NOVO DROP</Link>
            <Link href="/produtos">SHOP</Link>
            <Link href="/produtos?destaques=1">VN SELECTS</Link>
            <Link href="/lookbook">LOOKBOOK</Link>
          </nav>
          <div className="header-actions">
            <button
              className="icon-button"
              aria-label="Buscar produtos"
              onClick={() => setSearch(true)}
            >
              <Search size={21} />
            </button>
            <Link
              className="icon-button favorite-header"
              aria-label={`Favoritos, ${favorites.length} peças`}
              href="/favoritos"
            >
              <Heart size={21} />
            </Link>
            <button
              className="bag-button"
              onClick={() => setCartOpen(true)}
              aria-label={`Sacola ${cart.reduce((s, l) => s + l.quantity, 0)} peças. Abrir sacola`}
            >
              <ShoppingBag size={21} />
              <span className="bag-word">SACOLA</span>{" "}
              <span className="bag-count">
                {cart.reduce((s, l) => s + l.quantity, 0)}
              </span>
            </button>
          </div>
        </div>
      </header>
      <Modal open={menu} onOpenChange={setMenu} title="EXPLORE A VN" drawer>
        <nav className="mobile-nav">
          {[
            ["TODAS AS PEÇAS", "/produtos"],
            ["NOVO DROP", "/produtos?novidades=1"],
            ["VN SELECTS", "/produtos?destaques=1"],
            ["LOOKBOOK", "/lookbook"],
            ["FAVORITOS", "/favoritos"],
            ...catalog.categories.map((c) => [
              c.name.toUpperCase(),
              `/categorias/${c.slug}`,
            ]),
          ].map(([title, href]) => (
            <Link key={href} href={href} onClick={() => setMenu(false)}>
              {title}
            </Link>
          ))}
        </nav>
      </Modal>
      <Modal
        open={search}
        onOpenChange={setSearch}
        title="QUAL É O SEU PRÓXIMO FIT?"
        wide
      >
        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/produtos?q=${encodeURIComponent(term)}`);
            setSearch(false);
          }}
        >
          <label className="sr-only" htmlFor="store-search">
            Buscar no catálogo
          </label>
          <input
            id="store-search"
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Camiseta, cargo, sneaker…"
          />
          <button className="button" type="submit">
            BUSCAR
          </button>
        </form>
        <p className="muted">Explore também</p>
        <div className="chips">
          {catalog.categories.map((c) => (
            <Link
              className="chip"
              key={c.id}
              href={`/categorias/${c.slug}`}
              onClick={() => setSearch(false)}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </Modal>
    </>
  );
}
export function CartLines() {
  const items = useCartItems();
  const { quantity, remove } = useStore();
  return (
    <div className="cart-lines">
      {items.map(({ product: p, variant: v, quantity: q, price }) => (
        <article className="cart-line" key={v.id}>
          <Link href={`/produto/${p.slug}`}>
            <Image
              src={v.image || p.images[0].url}
              width={108}
              height={120}
              alt={p.name}
            />
          </Link>
          <div>
            <Link className="cart-name" href={`/produto/${p.slug}`}>
              {p.name}
            </Link>
            <p className="muted small">
              {v.color} / {v.size}
            </p>
            <strong>{money(price * q)}</strong>
            <div className="quantity">
              <button
                aria-label={`Diminuir quantidade de ${p.name}`}
                onClick={() => quantity(v.id, q - 1)}
              >
                <Minus size={14} />
              </button>
              <span>{q}</span>
              <button
                aria-label={`Aumentar quantidade de ${p.name}`}
                onClick={() => quantity(v.id, q + 1)}
                disabled={q >= v.stock}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <button
            className="icon-button"
            aria-label={`Remover ${p.name}`}
            onClick={() => remove(v.id)}
          >
            <Trash2 size={17} />
          </button>
        </article>
      ))}
    </div>
  );
}
export function CartDrawer() {
  const { cartOpen, setCartOpen, catalog } = useStore();
  const items = useCartItems();
  const subtotal = items.reduce((s, l) => s + l.price * l.quantity, 0);
  return (
    <Modal
      open={cartOpen}
      onOpenChange={setCartOpen}
      title={`SUA SACOLA (${items.reduce((s, l) => s + l.quantity, 0)})`}
      drawer
    >
      {items.length ? (
        <>
          <CartLines />
          <div className="cart-bottom">
            {catalog.settings.freeShippingFromCents > 0 && (
              <div className="shipping-progress">
                <p>
                  {subtotal >= catalog.settings.freeShippingFromCents
                    ? "Você atingiu o valor mínimo para frete grátis."
                    : `Faltam ${money(catalog.settings.freeShippingFromCents - subtotal)} para frete grátis.`}
                </p>
                <progress
                  value={Math.min(
                    subtotal,
                    catalog.settings.freeShippingFromCents,
                  )}
                  max={catalog.settings.freeShippingFromCents}
                />
              </div>
            )}
            <div className="summary-line">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <p className="muted small">
              Frete e descontos calculados na próxima etapa.
            </p>
            <Link
              className="button full"
              href="/checkout"
              onClick={() => setCartOpen(false)}
            >
              CONTINUAR PARA O CHECKOUT
            </Link>
            <Link
              className="text-link centered"
              href="/sacola"
              onClick={() => setCartOpen(false)}
            >
              VER SACOLA COMPLETA
            </Link>
            <p className="secure-note">
              <ShieldCheck size={15} />
              {catalog.demo
                ? "Compra de demonstração. Nenhuma cobrança."
                : "Seus dados protegidos durante a compra."}
            </p>
          </div>
        </>
      ) : (
        <div className="empty">
          <ShoppingBag size={44} />
          <h2>
            A próxima peça
            <br />
            está esperando.
          </h2>
          <p>Sua sacola ainda está vazia.</p>
          <Link
            className="button"
            href="/produtos"
            onClick={() => setCartOpen(false)}
          >
            EXPLORAR A SELEÇÃO
          </Link>
        </div>
      )}
    </Modal>
  );
}
export function Footer() {
  const { catalog } = useStore();
  const s = catalog.settings;
  const [cookies, setCookies] = useState(false);
  const wa = whatsappUrl(
    s.whatsapp,
    "Olá! Vim pelo site da VN Imports e gostaria de atendimento.",
  );
  return (
    <>
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-brand">
            <Image
              src={s.logo || "/images/vn-logo.webp"}
              alt="VN Imports"
              width={90}
              height={90}
            />
            <h2>
              ESTILO É<br />
              IDENTIDADE.
            </h2>
            <p>Selecionado pela VN. Feito para você.</p>
          </div>
          <div>
            <h3>EXPLORE</h3>
            <Link href="/produtos">Todas as peças</Link>
            <Link href="/colecoes">Drops</Link>
            <Link href="/lookbook">Lookbook</Link>
            <Link href="/favoritos">Meus favoritos</Link>
          </div>
          <div>
            <h3>PODE CONFIAR</h3>
            <Link href="/politicas/trocas">Trocas e devoluções</Link>
            <Link href="/politicas/entregas">Entregas</Link>
            <Link href="/politicas/privacidade">Privacidade</Link>
            <Link href="/politicas/termos">Termos de uso</Link>
            <Link href="/politicas/cookies">Cookies</Link>
            <button className="footer-link" onClick={() => setCookies(true)}>
              Preferências de cookies
            </button>
          </div>
          <div>
            <h3>CHEGA JUNTO</h3>
            <a href={s.instagram} target="_blank" rel="noopener noreferrer">
              <Instagram size={17} />
              @vn.imp_067
            </a>
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={17} />
                Falar no WhatsApp
              </a>
            ) : (
              <Link href="/contato">Atendimento</Link>
            )}
            {s.email && <a href={`mailto:${s.email}`}>{s.email}</a>}
            {s.serviceHours && <p>{s.serviceHours}</p>}
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {s.name}.{" "}
            {catalog.demo ? "Vitrine demonstrativa." : ""}
          </span>
          <span className="payment-marks">
            PIX <span>VISA</span> mastercard
          </span>
        </div>
        {s.businessName && (
          <p className="business-details">
            {s.businessName} · {s.businessDocument} · {s.businessAddress}
          </p>
        )}
      </footer>
      {wa && (
        <a
          className="whatsapp-float"
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Atendimento pelo WhatsApp"
        >
          <MessageCircle size={24} />
        </a>
      )}
      <CookiePreferences
        forceOpen={cookies}
        onClose={() => setCookies(false)}
      />
    </>
  );
}
