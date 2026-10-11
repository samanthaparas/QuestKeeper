import { describe, it, expect, vi, beforeEach } from "vitest";

// A tiny stand-in for the Supabase client: records what was sent and
// answers with whatever `result` holds.
const calls = [];
let result = { data: null, error: null };

function query() {
  const chain = {};
  for (const method of ["select", "insert", "update", "delete", "eq", "is", "order", "single"]) {
    chain[method] = (...args) => {
      calls.push([method, ...args]);
      return chain;
    };
  }
  chain.then = (resolve) => resolve(result);
  return chain;
}

vi.mock("./supabaseClient", () => ({
  supabase: {
    from: (table) => {
      calls.push(["from", table]);
      return query();
    },
    rpc: (name, args) => {
      calls.push(["rpc", name, args]);
      return Promise.resolve(result);
    },
  },
}));

import {
  createHomebrew,
  getInvite,
  acceptInvite,
  inviteUrl,
  listGrants,
} from "./homebrewStore";

beforeEach(() => {
  calls.length = 0;
  result = { data: null, error: null };
});

describe("homebrewStore", () => {
  it("cleans the form before saving", async () => {
    result = { data: { id: "r1" }, error: null };

    await createHomebrew({
      category: "race",
      name: "  Owlfolk  ",
      basedOn: "",
      linkUrl: " ",
      summary: " Feathered. ",
      data: { speed: "35", abilityBonuses: { wis: 2, luck: 5 } },
      isShared: 1,
    });

    const [, row] = calls.find(([method]) => method === "insert");
    expect(row).toMatchObject({
      category: "race",
      name: "Owlfolk",
      based_on: null,
      link_url: null,
      summary: "Feathered.",
      is_shared: true,
    });
    expect(row.data.speed).toBe(35);
    expect(row.data.abilityBonuses).toEqual({ wis: 2 });
  });

  it("passes database errors on", async () => {
    result = { data: null, error: new Error("nope") };
    await expect(createHomebrew({ category: "race", name: "X" })).rejects.toThrow("nope");
  });

  it("reads an invite's status, with a safe answer for unknown codes", async () => {
    result = { data: [{ sender_label: "Sam", status: "ok" }], error: null };
    expect(await getInvite("abc")).toEqual({ sender_label: "Sam", status: "ok" });

    result = { data: [], error: null };
    expect(await getInvite("abc")).toEqual({ sender_label: null, status: "not_found" });
  });

  it("accepts an invite through the database function", async () => {
    await acceptInvite("INVITE123");
    expect(calls).toContainEqual(["rpc", "accept_homebrew_invite", { p_code: "INVITE123" }]);
  });

  it("builds a shareable link", () => {
    expect(
      inviteUrl("ABC123", { origin: "https://questkeeper.app", pathname: "/" }),
    ).toBe("https://questkeeper.app/#/homebrew/invite/ABC123");
  });

  it("splits grants into shared-by-me and shared-with-me", async () => {
    result = {
      data: [
        { owner_id: "me", grantee_id: "jordan" },
        { owner_id: "alex", grantee_id: "me" },
      ],
      error: null,
    };
    const grants = await listGrants("me");
    expect(grants.sharedByMe).toEqual([{ owner_id: "me", grantee_id: "jordan" }]);
    expect(grants.sharedWithMe).toEqual([{ owner_id: "alex", grantee_id: "me" }]);
  });
});
