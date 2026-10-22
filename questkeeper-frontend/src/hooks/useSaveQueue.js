import { useCallback, useEffect, useRef, useState } from "react";
import { writeSheetCache } from "../utils/sheetCache";

// Saves a character sheet in the background, and never lets a weak signal
// lose changes.
//  - queueSave(sheet) saves a moment after the last change (so typing isn't a
//    save per letter), and writes a copy on this device straight away.
//  - If a save fails it keeps the changes, says so (status "waiting"), and
//    tries again by itself: after a few seconds, then longer, whenever the
//    connection comes back, and when the person returns to the tab.
//  - A newer change always replaces an older one that hadn't saved yet, so
//    the last thing typed is what ends up saved.
//  - Closing the page with changes not saved asks first.
//
// status: "saved" | "saving" | "waiting" (a save failed, retrying) |
// "signed-out" (needs a login before it can save).
// save(sheet) resolves to the saved sheet. onSaved(saved) hears about each
// save. baseUpdatedAt() gives the server's "last updated" time for the
// version being edited (kept with the copy on this device).

const DELAY_MS = 600;
const RETRY_MS = [4000, 8000, 16000, 30000, 60000];

export function useSaveQueue({ characterId, save, onSaved, baseUpdatedAt }) {
  const [status, setStatus] = useState("saved");
  const [error, setError] = useState("");
  const pending = useRef(null);
  const inFlight = useRef(false);
  const timer = useRef(null);
  const failures = useRef(0);
  // The latest callbacks, without making the save loop depend on them.
  const latest = useRef({ save, onSaved, baseUpdatedAt });
  const attemptRef = useRef(() => {});
  useEffect(() => {
    latest.current = { save, onSaved, baseUpdatedAt };
  });

  const attempt = useCallback(async () => {
    clearTimeout(timer.current);
    if (inFlight.current || !pending.current) return;
    const sheet = pending.current;
    inFlight.current = true;
    setStatus("saving");
    try {
      const saved = await latest.current.save(sheet);
      failures.current = 0;
      setError("");
      if (pending.current === sheet) {
        // Nothing newer arrived while this was saving: all caught up.
        pending.current = null;
        writeSheetCache(characterId, { sheet: { ...sheet, updatedAt: saved.updatedAt }, synced: true, baseUpdatedAt: saved.updatedAt });
        setStatus("saved");
      } else {
        // A newer change came in meanwhile: save that one next.
        timer.current = setTimeout(() => attemptRef.current(), DELAY_MS);
      }
      latest.current.onSaved?.(saved);
    } catch (failure) {
      const signedOut = /signed out/i.test(failure?.message ?? "");
      setError(failure?.message ?? "");
      setStatus(signedOut ? "signed-out" : "waiting");
      if (!signedOut) {
        const wait = RETRY_MS[Math.min(failures.current, RETRY_MS.length - 1)];
        failures.current += 1;
        timer.current = setTimeout(() => attemptRef.current(), wait);
      }
    } finally {
      inFlight.current = false;
    }
  }, [characterId]);
  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  const queueSave = useCallback(
    (sheet) => {
      pending.current = sheet;
      writeSheetCache(characterId, { sheet, synced: false, baseUpdatedAt: latest.current.baseUpdatedAt?.() ?? null });
      setStatus((current) => (current === "waiting" || current === "signed-out" ? current : "saving"));
      clearTimeout(timer.current);
      timer.current = setTimeout(() => attemptRef.current(), DELAY_MS);
    },
    [characterId],
  );

  // "Try now": straight away, without waiting for the next retry.
  const retryNow = useCallback(() => {
    failures.current = 0;
    attemptRef.current();
  }, []);

  // Back online, or back on the tab: try again.
  useEffect(() => {
    function wake() {
      if (pending.current && (status === "waiting" || status === "signed-out")) retryNow();
    }
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [status, retryNow]);

  // Closing the page with changes not saved: ask first.
  useEffect(() => {
    if (status === "saved") return undefined;
    function warn(event) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  // Leaving the sheet: save what's waiting right away.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current && !inFlight.current) {
        latest.current.save(pending.current).catch(() => {
          // The copy on this device still has it; it saves on the next visit.
        });
      }
    },
    [],
  );

  return { status, error, queueSave, retryNow };
}
