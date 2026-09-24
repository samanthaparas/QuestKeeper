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
} from "../utils/srdDetails";

function withSource(source) {
  return (entries) => entries.map((entry) => ({ ...entry, source }));
}

function loadDetails(match) {
  return match.source === "magic-items"
    ? getMagicItemDetails(match.index, match.edition).then(
        formatMagicItemDetails,
      )
    : getEquipmentDetails(match.index, match.edition).then(
        formatEquipmentDetails,
      );
}

export function useSrdEquipmentLookup() {
  const [srdItems, setSrdItems] = useState([]);

  useEffect(() => {
    Promise.allSettled([
      getEquipment("2014").then(withSource("equipment")),
      getMagicItems("2014").then(withSource("magic-items")),
      getEquipment("2024").then(withSource("equipment")),
      getMagicItems("2024").then(withSource("magic-items")),
    ]).then((results) =>
      setSrdItems(
        results.flatMap((result) =>
          result.status === "fulfilled" ? result.value : [],
        ),
      ),
    );
  }, []);

  const findMatches = useMemo(() => createSrdNameLookup(srdItems), [srdItems]);

  return { findMatches, loadDetails };
}
