"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui";
import { api } from "@/lib/utils";
export function AdminLogin({ demo }: { demo: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <main className="admin-login">
      <div>
        <Image
          src="/images/vn-logo.webp"
          width={100}
          height={100}
          alt="VN Imports"
        />
        <p className="eyebrow">ACESSO RESTRITO / VN IMPORTS</p>
        <h1>
          O CONTROLE
          <br />É SEU.
        </h1>
        <p className="muted">Entre para administrar sua loja.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/api/auth/login", { email, password });
              router.push("/admin");
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          <Field label="E-mail administrativo">
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Senha">
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button full" disabled={busy}>
            {busy ? "ENTRANDO…" : "ENTRAR NO PAINEL"}
          </button>
        </form>
        {demo && (
          <p className="small muted">
            Use o acesso local criado durante a configuração do projeto. Não
            existe cadastro administrativo público.
          </p>
        )}
        <Link className="text-link" href="/">
          VOLTAR À LOJA
        </Link>
      </div>
      <aside>
        <Image
          src="/images/lookbook.webp"
          alt="Editorial VN Imports"
          width={1000}
          height={1333}
        />
        <span>SELECTED BY VN.</span>
      </aside>
    </main>
  );
}
