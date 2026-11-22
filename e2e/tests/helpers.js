// Shared steps for the two-browser tests.

import { expect } from "@playwright/test";

// Signs someone in through the real sign-in page.
export async function signIn(page, person) {
  await page.goto("/#/login");
  await page.getByLabel("Email", { exact: true }).fill(person.email);
  await page.getByLabel("Password", { exact: true }).fill(person.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
}

// A fresh browser (its own sign-in, like a second laptop) for one person.
export async function openBrowserFor(browser, person) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, person);
  return { context, page };
}
