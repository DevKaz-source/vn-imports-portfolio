import { randomBytes } from "node:crypto";
import { access, readFile, writeFile, mkdir } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
try {
  await access(".env.local");
  console.log(
    "O arquivo .env.local já existe. Nenhuma configuração foi substituída.",
  );
  process.exit(0);
} catch {}
let email = "admin@vn.local";
if (process.stdin.isTTY) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  email =
    (
      await rl.question(
        "E-mail para o acesso administrativo local [admin@vn.local]: ",
      )
    ).trim() || email;
  rl.close();
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("E-mail inválido.");
  process.exit(1);
}
const password = randomBytes(15).toString("base64url");
const secret = randomBytes(48).toString("hex");
const template = await readFile(".env.example", "utf8");
const content = template
  .replace("DEMO_ADMIN_EMAIL=", `DEMO_ADMIN_EMAIL=${email}`)
  .replace("DEMO_ADMIN_PASSWORD=", `DEMO_ADMIN_PASSWORD=${password}`)
  .replace("SESSION_SECRET=", `SESSION_SECRET=${secret}`);
await writeFile(".env.local", content, { mode: 0o600 });
await mkdir(".data", { recursive: true });
await writeFile(
  ".data/acesso-local.txt",
  `VN IMPORTS — ACESSO LOCAL\nE-mail: ${email}\nSenha: ${password}\nPainel: http://localhost:3000/admin\n\nNão publique este arquivo nem .env.local.\n`,
  { mode: 0o600 },
);
console.log(
  "Configuração local concluída.\nAcesso administrativo salvo em .data/acesso-local.txt.\nInicie a loja com npm run dev e abra http://localhost:3000.",
);
