// The browser tab title for each page ("Feats · QuestKeeper"), so tabs,
// history and screen readers say where you are. The menu already names most
// pages, so its labels are reused; anything else falls back to the app name.

import { NAV_GROUPS } from "../components/Header/Navigation/navGroups";

const APP_NAME = "QuestKeeper";

// Pages that aren't in the menu.
const EXTRA_TITLES = {
  "/search": "Search",
  "/characters/new": "New Character",
  "/login": "Log In",
  "/sample/character": "Sample Character",
  "/sample/table": "Sample DM Table",
  "/attributions": "Sources & Licenses",
};

export function getPageTitle(pathname = "/") {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return APP_NAME;

  const named =
    EXTRA_TITLES[path] ??
    // The longest menu link that the page sits under, so "/games/abc" is "My Games".
    NAV_GROUPS.flatMap((group) => group.items)
      .filter((item) => path === item.to || path.startsWith(`${item.to}/`))
      .sort((a, b) => b.to.length - a.to.length)[0]?.label;

  return named ? `${named} \u00b7 ${APP_NAME}` : APP_NAME;
}
