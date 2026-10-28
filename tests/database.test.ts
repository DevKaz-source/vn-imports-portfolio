import { beforeAll, afterAll, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createSeed } from "@/domain/seed";
import { calculateTotals, resolveLines } from "@/domain/commerce";
let db: PGlite;
const state = createSeed();
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,bucket_id text);alter table storage.objects enable row level security;`,
  );
  const migration = (
    await readFile("supabase/migrations/202610070001_store.sql", "utf8")
  ).replace("create extension if not exists pgcrypto;", "");
  await db.exec(migration);
  await db.query("insert into store_settings(id,data) values(1,$1)", [
    state.settings,
  ]);
  for (const p of state.products)
    await db.query("select save_product($1,null)", [p]);
});
afterAll(async () => {
  await db?.close();
});
it("migrations e RPCs executam em PostgreSQL e impedem venda acima do estoque", async () => {
  const p = state.products[0];
  const v = p.variants[0];
  await db.query("update product_variants set stock=1 where id=$1", [v.id]);
  function order() {
    const items = resolveLines(
      state.products,
      [{ productId: p.id, variantId: v.id, quantity: 1 }],
      state.settings,
    );
    return {
      id: randomUUID(),
      number: randomUUID(),
      idempotencyKey: randomUUID(),
      requestHash: "hash",
      accessHash: "access",
      customer: { email: "test@example.com" },
      items,
      ...calculateTotals(items, 0, "pix"),
      couponCode: "",
      status: "pending_payment",
      inventoryState: "reserved",
      history: [],
      paymentStatus: "created",
      createdAt: new Date().toISOString(),
    };
  }
  const first = order();
  await db.query("select reserve_order($1,null)", [first]);
  await expect(
    db.query("select reserve_order($1,null)", [order()]),
  ).rejects.toThrow("STOCK");
  expect(
    (
      await db.query<{ stock: number }>(
        "select stock from product_variants where id=$1",
        [v.id],
      )
    ).rows[0].stock,
  ).toBe(0);
  await db.query("select reserve_order($1,null)", [first]);
  expect(
    (
      await db.query<{ count: number }>(
        "select count(*)::int as count from orders",
      )
    ).rows[0].count,
  ).toBe(1);
  await db.query("select apply_order_status($1,$2,$3)", [
    first.id,
    "cancelled",
    "Teste",
  ]);
  await db.query("select apply_order_status($1,$2,$3)", [
    first.id,
    "cancelled",
    "Repetido",
  ]);
  expect(
    (
      await db.query<{ stock: number }>(
        "select stock from product_variants where id=$1",
        [v.id],
      )
    ).rows[0].stock,
  ).toBe(1);
});
it("RLS está habilitada em todas as tabelas de negócio", async () => {
  const result = await db.query<{ relname: string; relrowsecurity: boolean }>(
    "select relname,relrowsecurity from pg_class join pg_namespace ns on ns.oid=relnamespace where ns.nspname='public' and relkind='r'",
  );
  expect(result.rows.length).toBeGreaterThan(15);
  expect(result.rows.every((t) => t.relrowsecurity)).toBe(true);
});
it("anônimo não consegue ler pedidos nem reservar estoque por RPC", async () => {
  await db.exec("set role anon");
  try {
    await expect(db.query("select * from orders")).rejects.toThrow(
      "permission denied",
    );
    await expect(
      db.query("select reserve_order($1,null)", [{}]),
    ).rejects.toThrow("permission denied");
  } finally {
    await db.exec("reset role");
  }
});
it("edição de produto preserva estoque e rejeita atualização antiga", async () => {
  const p = state.products[1];
  await db.query("select adjust_inventory($1,3,$2,$3)", [
    p.variants[0].id,
    "Reposição",
    "admin",
  ]);
  const edited = {
    ...p,
    name: "Nome atualizado",
    updatedAt: new Date().toISOString(),
    variants: p.variants.map((v) => ({ ...v, stock: 9999 })),
  };
  await db.query("select save_product($1,$2)", [edited, p.updatedAt]);
  expect(
    (
      await db.query<{ stock: number }>(
        "select stock from product_variants where id=$1",
        [p.variants[0].id],
      )
    ).rows[0].stock,
  ).toBe(8);
  await expect(
    db.query("select save_product($1,$2)", [edited, p.updatedAt]),
  ).rejects.toThrow("CONFLICT");
});
