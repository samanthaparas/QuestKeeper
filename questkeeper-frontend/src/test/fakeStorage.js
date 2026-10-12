import { vi } from "vitest";

// Newer Node versions ship their own incomplete localStorage that can shadow
// the test environment's, so tests that use storage bring a tiny in-memory
// one. That keeps them passing on any Node version (CI runs a newer Node
// than a laptop might). Call it in beforeEach for a fresh, empty storage.
export function installFakeStorage() {
  const data = new Map();
  const fake = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      data.set(key, String(value));
    },
    removeItem: (key) => {
      data.delete(key);
    },
    clear: () => data.clear(),
  };

  vi.stubGlobal("localStorage", fake);
  try {
    Object.defineProperty(window, "localStorage", { value: fake, configurable: true });
  } catch {
    // The stubbed global above is enough where window is the global object.
  }
  return fake;
}
