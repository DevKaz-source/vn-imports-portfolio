import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";
process.env.E2E_ADMIN_PASSWORD ??= randomBytes(24).toString("base64url");
const binary = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: binary
      ? {
          executablePath: binary,
          args: [
            "--no-sandbox",
            "--no-zygote",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--host-resolver-rules=MAP localhost 127.0.0.1",
          ],
        }
      : {},
  },
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      STORE_MODE: "demo",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      DEMO_DATA_DIR: ".data/e2e",
      DEMO_ADMIN_EMAIL: "qa@vn.test",
      DEMO_ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD,
      SESSION_SECRET: randomBytes(48).toString("hex"),
    },
  },
});
