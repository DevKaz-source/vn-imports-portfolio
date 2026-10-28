import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSeed } from "@/domain/seed";
import type { State } from "@/domain/types";
const globals = globalThis as typeof globalThis & {
  vnQueue?: Promise<unknown>;
};
const statePath = () =>
  path.resolve(process.env.DEMO_DATA_DIR || ".data", "store.json");
async function load(): Promise<State> {
  try {
    return JSON.parse(await readFile(statePath(), "utf8")) as State;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return createSeed();
    throw e;
  }
}
export async function demoTransaction<T>(
  operation: (state: State) => T | Promise<T>,
): Promise<T> {
  const task = (globals.vnQueue || Promise.resolve()).then(async () => {
    const state = await load();
    const result = await operation(state);
    await mkdir(path.dirname(statePath()), { recursive: true });
    const temp = statePath() + ".tmp";
    await writeFile(temp, JSON.stringify(state), { mode: 0o600 });
    await rename(temp, statePath());
    return result;
  });
  globals.vnQueue = task.catch(() => {});
  return task;
}
export async function readDemo() {
  await globals.vnQueue;
  return load();
}
