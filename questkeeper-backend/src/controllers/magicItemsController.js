import {
  resolveEdition,
  fetchDnd5eList,
  fetchDnd5eById,
} from "../utils/dnd5eApiClient.js";
import { fetchOpen5eResource, notFound } from "../utils/open5eClient.js";
import {
  MAGIC_ITEM_SOURCES,
  buildCatalog,
  getCatalogItem,
} from "../utils/magicItemCatalog.js";

export async function getMagicItems(req, res, next) {
  try {
    const edition = resolveEdition(req.query);
    const data = await fetchDnd5eList(
      "magic-items",
      edition,
      "Unable to retrieve magic items.",
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getMagicItemById(req, res, next) {
  try {
    const { magicItemId } = req.params;
    const edition = resolveEdition(req.query);
    const data = await fetchDnd5eById(
      "magic-items",
      edition,
      magicItemId,
      "Unable to retrieve magic item details.",
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

// --- Catalog (the Magic Items page) ----------------------------------------------
// Every open-licensed magic item with its filterable facts worked out. The
// list leaves out the long descriptions; one item at a time includes them.

export function fetchCatalogItems() {
  return fetchOpen5eResource("magicitems", Object.keys(MAGIC_ITEM_SOURCES));
}

export async function getMagicItemCatalog(req, res, next) {
  try {
    const data = buildCatalog(await fetchCatalogItems()).map(({ openKeys, ...entry }) => entry);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getMagicItemCatalogEntry(req, res, next) {
  try {
    const entry = getCatalogItem(await fetchCatalogItems(), req.params.itemIndex);
    if (!entry) throw notFound("Unable to find that magic item.");
    const { openKeys, ...data } = entry;
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}
