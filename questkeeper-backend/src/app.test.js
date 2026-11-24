import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import app from "./app.js";

let server;
let base;

beforeAll(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));
afterEach(() => {
  delete process.env.ALLOWED_ORIGINS;
});

const ask = (origin) => fetch(`${base}/api/health`, { headers: origin ? { Origin: origin } : {} });

describe("who may call the API from a browser", () => {
  it("lets QuestKeeper's own website in", async () => {
    const response = await ask("https://questkeeper-it0i.onrender.com");
    expect(response.headers.get("access-control-allow-origin")).toBe("https://questkeeper-it0i.onrender.com");
  });

  it("lets a developer's own computer in", async () => {
    expect((await ask("http://localhost:5173")).headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect((await ask("http://127.0.0.1:4173")).headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:4173");
  });

  it("keeps other websites out", async () => {
    const response = await ask("https://some-other-site.example");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    // A look-alike address doesn't slip through either.
    expect((await ask("https://questkeeper-it0i.onrender.com.evil.example")).headers.get("access-control-allow-origin")).toBeNull();
  });

  it("lets in an extra address added in the settings (like a new domain)", async () => {
    process.env.ALLOWED_ORIGINS = "https://example-new-name.app, https://www.example-new-name.app/";
    expect((await ask("https://example-new-name.app")).headers.get("access-control-allow-origin")).toBe("https://example-new-name.app");
    expect((await ask("https://www.example-new-name.app")).headers.get("access-control-allow-origin")).toBe("https://www.example-new-name.app");
  });

  it("still answers a monitoring tool that sends no origin", async () => {
    const response = await ask();
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("ok");
  });

  it("answers a browser's check-first request from the site, with the sign-in header allowed", async () => {
    const response = await fetch(`${base}/api/recap`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://questkeeper-it0i.onrender.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
      },
    });
    expect(response.status).toBeLessThan(300);
    expect(response.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("authorization");
  });
});

describe("what the API says about itself", () => {
  it("doesn't announce Express, and marks answers as not-to-be-guessed-at", async () => {
    const response = await ask();
    expect(response.headers.get("x-powered-by")).toBeNull();
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
