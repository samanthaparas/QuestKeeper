// Before the two-browser tests: a clean local database with every migration
// (scripts/e2e-setup-db.sh), the test accounts, and a character each for the
// two players. Only ever talks to the local Supabase.

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { LOCAL, PEOPLE } from "./local.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const admin = {
  apikey: LOCAL.serviceKey,
  Authorization: `Bearer ${LOCAL.serviceKey}`,
  "Content-Type": "application/json",
};

async function makeAccount({ email, password }) {
  const response = await fetch(`${LOCAL.supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: admin,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!response.ok) throw new Error(`Couldn't make ${email}: ${await response.text()}`);
  return (await response.json()).id;
}

// A small, complete level 3 fighter with a few things in their pack. Same
// shape as createCharacterSheet in the app (utils/characterSheet.js), which
// Node can't import directly, so the sheet loads without missing pieces.
function sheet(name) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    level: 3,
    createdAt: now,
    updatedAt: now,
    size: "Medium",
    languages: "Common",
    inspiration: 0,
    gold: 10,
    experienceMode: "guided",
    background: null,
    savingThrows: { strength: true, dexterity: false, constitution: true, intelligence: false, wisdom: false, charisma: false },
    skills: {},
    skillExpertise: {},
    skillBonuses: {},
    saveBonus: 0,
    acBonus: 0,
    spellcasting: null,
    features: [],
    proficiencies: [],
    resources: [],
    abilityScoreImprovements: [],
    pendingLevelUp: null,
    notes: "",
    backstory: "",
    showBackstory: true,
    appearance: "",
    race: { id: "human", name: "Human" },
    class: { id: "fighter", name: "Fighter", hitDie: 10 },
    abilityScores: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 12, charisma: 10 },
    combat: {
      armorClass: 16,
      initiative: 2,
      speed: 30,
      hitPoints: { max: 28, current: 28, temporary: 0 },
      hitDice: { total: 3, remaining: 3, die: 10 },
      hpHistory: [],
    },
    equipment: [
      { index: "e2e-arrows", name: "Arrows", quantity: 20, description: "", attuned: false },
      { index: "e2e-potion", name: "Potion of Healing", quantity: 2, description: "", attuned: false },
    ],
    attacks: [],
    feats: [],
  };
}

export default async function globalSetup() {
  execFileSync(path.join(root, "scripts/e2e-setup-db.sh"), { stdio: "inherit" });

  const ids = {};
  for (const [who, person] of Object.entries(PEOPLE)) ids[who] = await makeAccount(person);

  for (const who of ["player", "friend"]) {
    const response = await fetch(`${LOCAL.supabaseUrl}/rest/v1/characters`, {
      method: "POST",
      headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ user_id: ids[who], data: sheet(PEOPLE[who].character) }),
    });
    if (!response.ok) throw new Error(`Couldn't make ${who}'s character: ${await response.text()}`);
  }
}
