// Refreshing to a new version of QuestKeeper by itself, at a safe moment.
//
// When a newer version is live, the page reloads quietly the next time the
// person looks away (switches tab or app) or moves to another page. Never
// while something could be lost or interrupted:
//  - a character sheet change that hasn't saved yet,
//  - a roll waiting for the numbers on real dice,
//  - a pop-up that's open,
//  - typing in a box right now, or words typed into a form that hasn't been
//    sent yet (a journal note, a message, an item being edited).
// Code that knows about other busy moments holds the refresh with
// useHoldRefresh(true) while they last.

import { useEffect } from "react";

const holds = new Set();

// Holds the refresh while active is true (one hold per component).
export function useHoldRefresh(active) {
  useEffect(() => {
    if (!active) return undefined;
    const token = Symbol("hold");
    holds.add(token);
    return () => holds.delete(token);
  }, [active]);
}

export function isRefreshHeld() {
  return holds.size > 0;
}

// Field types that hold words someone typed (not ticks, sliders or buttons).
const NOT_TYPED = new Set(["checkbox", "radio", "range", "file", "hidden", "submit", "button", "reset", "color", "image"]);

function isTypingField(element) {
  if (!element || element.disabled || element.readOnly) return false;
  if (element.tagName === "TEXTAREA") return true;
  if (element.tagName === "INPUT") return !NOT_TYPED.has((element.type || "text").toLowerCase());
  return element.isContentEditable === true;
}

// Why now isn't a safe moment, or "" when it is. (A reason, not just
// true/false, so tests and the console can say what's holding it up.)
export function refreshBlocker(doc = document) {
  if (isRefreshHeld()) return "busy";
  if (doc.querySelector("dialog[open]")) return "pop-up open";
  if (isTypingField(doc.activeElement)) return "typing";
  const unsent = [...doc.querySelectorAll("form textarea, form input")].some(
    (field) => isTypingField(field) && String(field.value ?? "").trim() !== "",
  );
  if (unsent) return "unsent words in a form";
  return "";
}

// Each new version gets one automatic refresh at most, so a server still
// handing out the old page can never cause a reload loop.
const DONE_KEY = "qk-auto-refreshed-for";

export function alreadyRefreshedFor(build) {
  try {
    return window.sessionStorage.getItem(DONE_KEY) === build;
  } catch {
    return true; // can't remember it, so don't risk a loop
  }
}

export function markRefreshedFor(build) {
  try {
    window.sessionStorage.setItem(DONE_KEY, build);
    return true;
  } catch {
    return false;
  }
}

// Reloads now if it's safe and this version hasn't had its refresh yet.
// Returns whether it reloaded. reload is swappable for tests.
export function refreshIfSafe(build, { doc = document, reload = () => window.location.reload() } = {}) {
  if (!build || alreadyRefreshedFor(build) || refreshBlocker(doc)) return false;
  if (!markRefreshedFor(build)) return false;
  reload();
  return true;
}
