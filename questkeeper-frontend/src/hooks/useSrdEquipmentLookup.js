import { useEffect, useMemo, useState } from "react";
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

// status: "loading", "ready", or "failed" (none of the SRD item lists could be
// loaded, so names can't link to their details and armor isn't recognised).
// retry() tries again.
export function useSrdEquipmentLookup() {
  const [state, setState] = useState({ items: [], status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    Promise.allSettled([
      getEquipment("2014").then(tagWithSource("equipment")),
      getMagicItems("2014").then(tagWithSource("magic-items")),
      getEquipment("2024").then(tagWithSource("equipment")),
      getMagicItems("2024").then(tagWithSource("magic-items")),
    ]).then((results) => {
      if (ignore) return;
      const items = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
      const failed = results.every((result) => result.status === "rejected");
      setState({ items, status: failed ? "failed" : "ready" });
    });
    return () => {
      ignore = true;
    };
  }, [attempt]);

  const findMatches = useMemo(() => createSrdNameLookup(state.items), [state.items]);

  return {
    findMatches,
    loadDetails,
    status: state.status,
    retry: () => {
      setState((previous) => ({ ...previous, status: "loading" }));
      setAttempt((count) => count + 1);
    },
  };
}
