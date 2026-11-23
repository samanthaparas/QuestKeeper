// A DM and two players at one table, each in their own browser: joining,
// what each side can see, a fight, and giving an item.
// Runs against the local Supabase only (see ../playwright.config.js).

import { test, expect } from "@playwright/test";
import { PEOPLE } from "../local.js";
import { openBrowserFor } from "./helpers.js";

test.describe.configure({ mode: "serial" });

let dm;
let player;
let friend;
let tablePath;
let joinCode;

test.beforeAll(async ({ browser }) => {
  dm = await openBrowserFor(browser, PEOPLE.dm);
  player = await openBrowserFor(browser, PEOPLE.player);
});

test.afterAll(async () => {
  await dm?.context.close();
  await player?.context.close();
  await friend?.context.close();
});

test("the DM makes a table and gets a join code", async () => {
  const page = dm.page;
  await page.goto("/#/dm");
  await page.getByLabel("Table name").fill("E2E Night");
  await page.getByRole("button", { name: "Create table" }).click();
  await expect(page).toHaveURL(/#\/dm\/tables\//);
  tablePath = new URL(page.url()).hash.replace("#", "").replace("/dm/tables/", "");
  joinCode = (await page.locator(".table-page__code-value").first().innerText()).trim();
  expect(joinCode).toMatch(/^[A-Z0-9]{6}$/);
});

test("the player joins with the code and one of their characters", async () => {
  const page = player.page;
  await page.goto("/#/games");
  await page.getByLabel("Join code from your DM").fill(joinCode);
  await page.getByLabel("Your character").selectOption({ label: "Rowan (Level 3 Fighter)" });
  await page.getByRole("button", { name: "Join table" }).click();
  await expect(page).toHaveURL(new RegExp(`#/games/${tablePath}`));
  await expect(page.getByText("E2E Night").first()).toBeVisible();
});

test("the DM sees the player arrive without reloading", async () => {
  await expect(dm.page.getByText("Rowan").first()).toBeVisible();
});

test("the DM adds a monster, and its HP and AC never reach the player", async () => {
  const page = dm.page;
  await page.getByRole("tab", { name: "Prep" }).click();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Goblin");
  await page.getByRole("spinbutton", { name: "HP", exact: true }).fill("7");
  await page.getByRole("spinbutton", { name: "AC", exact: true }).fill("13");
  await page.getByRole("spinbutton", { name: "Initiative", exact: true }).fill("5");
  await page.getByRole("button", { name: "Add to the fight" }).click();
  await expect(page.getByText("Goblin").first()).toBeVisible();

  const game = player.page.locator("main");
  await expect(game.getByText("Goblin").first()).toBeVisible();
  // Its name only: no HP, no AC.
  await expect(game).not.toContainText("7/7");
  await expect(game).not.toContainText("AC 13");
});

test("the player rolls initiative with real dice, and the DM starts the fight", async () => {
  const game = player.page;
  await game.getByLabel("Rolling real dice? Type just the number on your d20:").fill("15");
  await game.getByRole("button", { name: "Use my roll" }).click();
  await expect(game.getByText(/Your initiative/)).toBeVisible();

  await dm.page.getByRole("button", { name: "Start combat" }).first().click();
  // Rowan (15 + 2 = 17) goes before the goblin (5).
  await expect(game.getByRole("button", { name: "End my turn" })).toBeVisible();
});

test("the goblin attacks, and the player applies the damage on their sheet", async () => {
  await player.page.getByRole("button", { name: "End my turn" }).click();

  const page = dm.page;
  await page.getByRole("tab", { name: "Combat" }).click();
  const panel = page.locator("#detail-panel");
  await expect(panel).toContainText("Goblin");
  await panel.getByRole("button", { name: "Attack" }).click();
  await panel.getByLabel("Who is being attacked").selectOption({ label: "Rowan (player)" });
  await panel.getByLabel("Attack name").fill("Scimitar");
  await panel.getByLabel("Attack bonus").fill("4");
  await panel.getByLabel("Physical d20 roll").fill("18");
  await panel.getByRole("button", { name: "Use my roll" }).click();
  await expect(panel.locator(".monster-attack__result")).toContainText("That hits!");
  await panel.getByLabel("Physical damage total").fill("5");
  await panel.getByRole("button", { name: "Send this damage to Rowan" }).click();

  // On the player's sheet, the turn banner asks them to take it.
  const sheet = player.page;
  await sheet.getByRole("link", { name: "Open my character sheet" }).click();
  await sheet.getByRole("button", { name: "Apply 5 damage" }).click();
  await expect(sheet.getByText("Applied 5 damage: 5 from HP.")).toBeVisible();
  await expect(sheet.getByLabel("Current HP")).toHaveValue("23");
  // The DM sees it too, without reloading.
  await expect(page.getByText("23/28").first()).toBeVisible();
});

test("a player gives arrows to another player through the gift box", async ({ browser }) => {
  // A second player joins with Wren.
  friend = await openBrowserFor(browser, PEOPLE.friend);
  const other = friend.page;
  await other.goto("/#/games");
  await other.getByLabel("Join code from your DM").fill(joinCode);
  await other.getByLabel("Your character").selectOption({ label: "Wren (Level 3 Fighter)" });
  await other.getByRole("button", { name: "Join table" }).click();
  await expect(other).toHaveURL(new RegExp(`#/games/${tablePath}`));

  // Rowan's sheet picks up the new tablemate, then gives 5 arrows.
  const sheet = player.page;
  await sheet.reload();
  await sheet.getByRole("tab", { name: "Inventory" }).click();
  // Give… is in the item's Manage panel.
  await sheet.getByRole("button", { name: "Manage Arrows" }).click();
  await sheet.getByRole("button", { name: "Give Arrows…" }).click();
  await sheet.getByLabel("Who to give Arrows to").selectOption({ label: "Wren" });
  await sheet.getByLabel("How many Arrows to give").fill("5");
  await sheet.getByRole("button", { name: "Give", exact: true }).click();
  await expect(sheet.getByText(/Waiting for Wren to take 5 Arrows/)).toBeVisible();

  // Wren sees it in their gift box and takes it.
  await other.getByRole("link", { name: "Open my character sheet" }).click();
  await other.getByRole("tab", { name: "Inventory" }).click();
  const box = other.getByRole("region", { name: "Gifts" });
  await expect(box).toContainText("Rowan");
  await expect(box).toContainText("5 Arrows");
  await box.getByRole("button", { name: "Take it" }).click();
  await expect(box).toHaveCount(0);
  await expect(other.getByText("Arrows").first()).toBeVisible();

  // Rowan's waiting line goes away once Wren has it.
  await sheet.reload();
  await expect(sheet.getByText(/Waiting for Wren/)).toHaveCount(0);
});
