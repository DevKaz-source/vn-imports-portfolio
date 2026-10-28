import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
if (!files.length)
  throw new Error(
    "Adicione os arquivos ao Git antes de verificar a publicação.",
  );
const textExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".sql",
  ".css",
]);
const patterns = [
  ["chave privada", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  [
    "token GitHub",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/,
  ],
  ["chave AWS", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  [
    "credencial de pagamento",
    /\b(?:sk_live_[A-Za-z0-9]{20,}|APP_USR-[A-Za-z0-9-]{30,})\b/,
  ],
  [
    "JWT fixo",
    /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
  ],
];
const violations = [];
for (const file of files) {
  if (
    file
      .split("/")
      .some((part) =>
        [
          ".data",
          "node_modules",
          ".next",
          "test-results",
          "playwright-report",
          "uploads",
        ].includes(part),
      ) ||
    (/(?:^|\/)\.env(?:$|\.)/.test(file) && file !== ".env.example") ||
    /\.(?:pem|key|p12|pfx|db|sqlite\d*|log|zip|bak)$/i.test(file) ||
    /(?:^|\/)(?:\.npmrc|\.yarnrc\.yml|acesso-local\.txt)$/.test(file)
  ) {
    violations.push(`${file}: arquivo privado ou gerado`);
    continue;
  }
  if (!textExtensions.has(extname(file)) && file !== ".env.example") continue;
  const content = readFileSync(file, "utf8");
  for (const [label, pattern] of patterns)
    if (pattern.test(content)) violations.push(`${file}: possível ${label}`);
  if (file === ".env.example")
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (
        match &&
        /PASSWORD|SECRET|TOKEN|KEY/.test(match[1]) &&
        match[2].trim()
      )
        violations.push(`${file}: ${match[1]} deve estar vazio`);
    }
}
if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log(
  `Publicação verificada: ${files.length} arquivos, nenhum arquivo proibido ou padrão comum de credencial encontrado.`,
);
