import { describe, it, expect, vi, beforeEach } from "vitest";

const sentry = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn() }));
vi.mock("@sentry/react", () => sentry);

import { initMonitoring, reportError, resetMonitoring } from "./monitoring";

describe("error reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMonitoring();
  });

  it("does nothing, and loads nothing, when no address is set", async () => {
    expect(await initMonitoring({ DEV: false })).toBe(false);
    reportError(new Error("boom"));
    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("stays off while developing, even with an address", async () => {
    expect(await initMonitoring({ VITE_SENTRY_DSN: "https://k@o.ingest.sentry.io/1", DEV: true })).toBe(false);
    expect(sentry.init).not.toHaveBeenCalled();
  });

  it("starts with no personal details, no tracing and the site's version", async () => {
    expect(await initMonitoring({ VITE_SENTRY_DSN: "https://k@o.ingest.sentry.io/1", DEV: false, VITE_BUILD_ID: "abc123" })).toBe(true);
    const options = sentry.init.mock.calls[0][0];
    expect(options).toMatchObject({ sendDefaultPii: false, tracesSampleRate: 0, release: "abc123", environment: "production" });
    // Weak-signal errors the app already explains are left out.
    expect(options.ignoreErrors).toContain("Failed to fetch");
  });

  it("strips codes out of the page address before sending", async () => {
    await initMonitoring({ VITE_SENTRY_DSN: "https://k@o.ingest.sentry.io/1", DEV: false });
    const { beforeSend } = sentry.init.mock.calls[0][0];
    const event = beforeSend({ request: { url: "https://site.example/?code=ABC123#/games?join=XYZ", cookies: { a: "b" } } });
    expect(event.request.url).toBe("https://site.example/");
    expect(event.request.cookies).toBeUndefined();
  });

  it("reports an error with where in the page it happened, once it's on", async () => {
    await initMonitoring({ VITE_SENTRY_DSN: "https://k@o.ingest.sentry.io/1", DEV: false });
    const error = new Error("boom");
    reportError(error, "at SheetPage");
    expect(sentry.captureException).toHaveBeenCalledWith(error, { contexts: { react: { componentStack: "at SheetPage" } } });
  });

  it("survives the library failing to load", async () => {
    sentry.init.mockImplementationOnce(() => { throw new Error("bad dsn"); });
    expect(await initMonitoring({ VITE_SENTRY_DSN: "nonsense", DEV: false })).toBe(false);
    expect(() => reportError(new Error("x"))).not.toThrow();
  });
});
