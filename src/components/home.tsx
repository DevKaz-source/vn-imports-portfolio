"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Instagram,
  ShieldCheck,
  PackageCheck,
  MessageCircle,
} from "lucide-react";
import { useStore } from "./store-provider";
import { ProductCard } from "./product-card";
import { api } from "@/lib/utils";
export function Newsletter() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="newsletter">
      <div>
        <span className="eyebrow">ACESSO À PRÓXIMA SELEÇÃO</span>
        <h2>ENTRE PARA A VN LIST.</h2>
        <p>Novos drops e novidades. Direto para você.</p>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("/api/newsletter", { email, consent });
            setMessage("Você está na lista. Até o próximo drop.");
            setEmail("");
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="newsletter-input">
          <label className="sr-only" htmlFor="newsletter-email">
            Seu e-mail
          </label>
          <input
            id="newsletter-email"
            type="email"
            placeholder="Seu melhor e-mail"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={busy}>
            {busy ? "ENVIANDO…" : "QUERO ENTRAR"}
          </button>
        </div>
        <label className="check-row small">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
          />
          Aceito receber novidades e li a{" "}
          <Link href="/politicas/privacidade">Política de Privacidade</Link>.
        </label>
        <p role="status" className="small">
          {message}
        </p>
      </form>
    </section>
  );
}
export function Home() {
  const { catalog } = useStore();
  const hero = [...catalog.banners].sort((a, b) => a.order - b.order)[0];
  const products = catalog.products;
  const look = catalog.looks.find((l) => l.active);
  return (
    <>
      {hero && (
        <section
          className={`hero hero-${hero.position} ${hero.overlay ? "has-overlay" : ""}`}
        >
          <picture>
            <source
              media="(max-width: 640px)"
              srcSet={hero.mobileImage || hero.image}
            />
            <img
              src={hero.image}
              alt="Editorial streetwear VN Selection"
              fetchPriority="high"
              width={1672}
              height={941}
            />
          </picture>
          <div className="hero-content">
            <p className="eyebrow">{hero.eyebrow}</p>
            <h1>
              {hero.title.split("\n").map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </h1>
            <p className="hero-description">{hero.subtitle}</p>
            <Link className="button button-white" href={hero.href}>
              {hero.cta}
            </Link>
          </div>
          <div className="hero-bottom">
            <span>STREETWEAR / ESSENTIALS / LIFESTYLE</span>
            <span>SELECTED BY VN — 001</span>
          </div>
        </section>
      )}
      <div className="brand-strip">
        <span>SEM PADRÃO.</span>
        <span className="strip-outline">COM IDENTIDADE.</span>
        <span>VN IMPORTS</span>
        <span className="strip-outline">SEU PRÓXIMO FIT.</span>
      </div>
      <section className="section arrivals">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RECÉM-CHEGADOS</p>
            <h2>NO RADAR.</h2>
          </div>
          <Link className="text-link" href="/produtos?novidades=1">
            VER TODAS AS PEÇAS
          </Link>
        </div>
        <div className="product-grid">
          {products
            .filter((p) => p.isNew)
            .slice(0, 4)
            .map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
        </div>
      </section>
      <section className="section categories-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MONTE DO SEU JEITO</p>
            <h2>ENCONTRE SUA BASE.</h2>
          </div>
        </div>
        <div className="category-grid">
          {catalog.categories.slice(0, 4).map((c, i) => (
            <Link
              href={`/categorias/${c.slug}`}
              className="category-tile"
              key={c.id}
            >
              <Image
                src={c.image || "/images/vn-logo.webp"}
                alt={c.name}
                width={512}
                height={512}
              />
              <span className="category-number">0{i + 1}</span>
              <h3>{c.name.toUpperCase()}</h3>
            </Link>
          ))}
        </div>
      </section>
      {look && (
        <section className="look-feature">
          <div className="look-photo">
            <Image
              src={look.image}
              alt={look.name}
              width={1000}
              height={1333}
              sizes="(max-width: 760px) 100vw, 50vw"
            />
            <span className="photo-label">THE FIT / VOL. 01</span>
          </div>
          <div className="look-content">
            <span className="eyebrow">VN LOOKBOOK</span>
            <h2>
              MENOS REGRAS.
              <br />
              <span>MAIS VOCÊ.</span>
            </h2>
            <p>
              O fit começa nas peças.
              <br />A identidade vem de quem veste.
            </p>
            <Link className="button button-white" href="/lookbook">
              COMPRAR O LOOK
            </Link>
            <div className="look-index">
              <span>01 — ESSENTIALS</span>
              <span>SELECTED BY VN</span>
            </div>
          </div>
        </section>
      )}
      <section className="section selects">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A NOSSA CURADORIA</p>
            <h2>VN SELECTS.</h2>
          </div>
          <p className="section-note">
            Peças que merecem
            <br />
            um espaço no seu guarda-roupa.
          </p>
        </div>
        <div className="product-grid">
          {products
            .filter((p) => p.featured)
            .slice(0, 4)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>
      <section className="trust-strip">
        <div>
          <PackageCheck size={24} />
          <span>
            DO SEU JEITO<small>Tamanhos e variações na página da peça</small>
          </span>
        </div>
        <div>
          <ShieldCheck size={24} />
          <span>
            COMPRA TRANSPARENTE<small>Preço e frete antes de finalizar</small>
          </span>
        </div>
        <div>
          <MessageCircle size={24} />
          <span>
            CONVERSA DIRETA<small>Fale com a VN pelo Instagram</small>
          </span>
        </div>
      </section>
      <section className="section social-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A VN TAMBÉM ESTÁ NA RUA</p>
            <h2>FAZ PARTE DO FIT.</h2>
          </div>
          <a
            className="text-link"
            href={catalog.settings.instagram}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Instagram size={18} />
            @VN.IMP_067
          </a>
        </div>
        <div className="social-grid">
          {catalog.social.map((s) => (
            <a
              href={s.url}
              key={s.id}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src={s.image}
                width={700}
                height={700}
                sizes="(max-width:640px) 50vw,33vw"
                alt={s.alt}
              />
              <span>
                <Instagram size={20} />
              </span>
            </a>
          ))}
        </div>
        <p className="small muted">
          {catalog.demo
            ? "Editorial ilustrativo para apresentação da loja. "
            : ""}
          Acompanhe as novidades no Instagram oficial.
        </p>
      </section>
      <Newsletter />
    </>
  );
}
