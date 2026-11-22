// The two-browser tests (end-to-end): a DM and a player, each in their own
// browser, playing at the same table against a local Supabase. Never touches
// the real site or the real database.
//
// Before running: the local Supabase must be up (supabase --workdir e2e start).
// Run with: npm run test:e2e (from the repository root).

import { defineConfig } from "@playwright/test";
import { LOCAL } from "./local.js";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.js",
  // One table, one story: the tests run in order, not side by side.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${LOCAL.appPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    // The app, pointed at the local Supabase (these override the .env file),
    // and at a reference API address that isn't used in these tests.
    command: `npm run dev --workspace questkeeper-frontend -- --port ${LOCAL.appPort} --strictPort`,
    cwd: "..",
    url: `http://localhost:${LOCAL.appPort}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: LOCAL.supabaseUrl,
      VITE_SUPABASE_ANON_KEY: LOCAL.anonKey,
      VITE_API_BASE_URL: `http://localhost:${LOCAL.appPort}/no-reference-api`,
    },
  },
});
