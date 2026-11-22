import { describe, it, expect, vi, afterEach } from "vitest";
import { getHealth } from "./healthController.js";

// A stand-in for Express's response: records the status and the JSON sent.
function fakeResponse() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/health", () => {
  it("answers ok, with how long the server has been up", () => {
    const res = fakeResponse();
    getHealth({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.status).toBe("ok");
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("says whether the AI features are set up, without ever sending the key", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-not-a-real-key");
    const res = fakeResponse();
    getHealth({}, res);

    const body = res.json.mock.calls[0][0];
    expect(body.aiFeatures).toBe("set up");
    expect(JSON.stringify(body)).not.toContain("sk-test");

    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const second = fakeResponse();
    getHealth({}, second);
    expect(second.json.mock.calls[0][0].aiFeatures).toBe("not set up");
  });
});
