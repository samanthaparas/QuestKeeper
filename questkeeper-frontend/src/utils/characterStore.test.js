import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveCharacter } from "./characterStore";
import { supabase } from "./supabaseClient";

const single = vi.fn();
const upsert = vi.fn(() => ({ select: () => ({ single }) }));

vi.mock("./supabaseClient", () => ({
  supabase: {
    auth: { getSession: vi.fn(), getUser: vi.fn() },
    from: vi.fn(() => ({ upsert })),
  },
}));

describe("saveCharacter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    single.mockResolvedValue({
      data: { id: "c1", data: { name: "Dangit" }, updated_at: "2026-10-03T00:00:00Z" },
      error: null,
    });
  });

  it("uses the saved session to find the owner, without calling the login service", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });

    const saved = await saveCharacter({ id: "c1", name: "Dangit" });

    expect(supabase.auth.getUser).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ id: "c1", user_id: "u1" }));
    expect(saved.name).toBe("Dangit");
  });

  it("gives a clear error instead of crashing when signed out", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(saveCharacter({ id: "c1", name: "Dangit" })).rejects.toThrow(/signed out/i);
    expect(upsert).not.toHaveBeenCalled();
  });
});
