// Isolated, disposable data. Never points to a real merchant database.
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
await mkdir(".data", { recursive: true });
const directory = await mkdtemp(resolve(".data/e2e-"));
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3000",
  ],
  { stdio: "inherit", env: { ...process.env, DEMO_DATA_DIR: directory } },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", async (code) => {
  await rm(directory, { recursive: true, force: true });
  process.exit(code ?? 0);
});
