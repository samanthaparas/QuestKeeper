import { useEffect, useMemo, useRef, useState } from "react";
import {
  getEquipment,
  getEquipmentDetails,
  getMagicItems,
  getMagicItemDetails,
} from "../utils/api";
import {
  createSrdNameLookup,
  formatEquipmentDetails,
  formatMagicItemDetails,
  tagWithSource,
} from "../utils/srdDetails";

function loadDetails(match) {
  return match.source === "magic-items"
    ? getMagicItemDetails(match.index, match.edition).then(
        formatMagicItemDetails,
      )
    : getEquipmentDetails(match.index, match.edition).then(
        formatEquipmentDetails,
      );
}

// How long to wait before each automatic retry, in milliseconds. The free
// server can take up to about a minute to wake up, so the look-up keeps trying
// quietly (status stays "loading") before it ever says "failed".
export const RETRY_DELAYS = [4000, 8000, 16000, 32000];

// status: "loading" (including quiet retries), "ready", or "failed" (still
// nothing after the retries, so names can't link to their details and armor
// isn't recognised). retry() starts the whole thing again.
export function useSrdEquipmentLookup() {
  const [state, setState] = useState({ items: [], status: "loading" });
  const [attempt, setAttempt] = useState(0);
  // How many times in a row nothing loaded.
  const failures = useRef(0);

  useEffect(() => {
    let ignore = false;
    let timer = null;
    Promise.allSettled([
      getEquipment("2014").then(tagWithSource("equipment")),
      getMagicItems("2014").then(tagWithSource("magic-items")),
      getEquipment("2024").then(tagWithSource("equipment")),
      getMagicItems("2024").then(tagWithSource("magic-items")),
    ]).then((results) => {
      if (ignore) return;
      const items = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
      if (results.some((result) => result.status === "fulfilled")) {
        failures.current = 0;
        setState({ items, status: "ready" });
        return;
      }
      failures.current += 1;
      if (failures.current > RETRY_DELAYS.length) {
        setState({ items: [], status: "failed" });
      } else {
        timer = setTimeout(() => setAttempt((count) => count + 1), RETRY_DELAYS[failures.current - 1]);
      }
    });
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [attempt]);

  const findMatches = useMemo(() => createSrdNameLookup(state.items), [state.items]);

  return {
    findMatches,
    loadDetails,
    status: state.status,
    retry: () => {
      failures.current = 0;
      setState({ items: [], status: "loading" });
      setAttempt((count) => count + 1);
    },
  };
}
