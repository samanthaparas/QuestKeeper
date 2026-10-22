import { getCharacter } from "./characterStore";
import { readSheetCache, writeSheetCache } from "./sheetCache";

// Opens a character sheet, using the copy kept on this device (see
// sheetCache.js) when that's safer than the server's:
//   "server"     the normal case: the server's sheet (and the copy refreshed).
//   "offline"    the server couldn't be reached, so the last copy opens. Edits
//                keep working and save when the connection is back.
//   "recovered"  an earlier visit ended with edits that hadn't saved, and the
//                server's sheet hasn't changed since, so those edits come back.
//   "conflict"   edits were waiting AND the sheet changed somewhere else (another
//                device). The server's sheet is shown, with the waiting edits
//                in `mine`, so the person chooses.
// Resolves { sheet, source, unsynced?, mine? }; sheet is null when the
// character isn't there. Throws when the server can't be reached and there is
// no copy on this device.
export async function loadSheet(id, load = getCharacter) {
  const cached = readSheetCache(id);

  let server;
  try {
    server = await load(id);
  } catch (failure) {
    if (cached) return { sheet: cached.sheet, source: "offline", unsynced: !cached.synced };
    throw failure;
  }
  if (!server) return { sheet: null, source: "server" };

  if (cached && !cached.synced) {
    if (!cached.baseUpdatedAt || cached.baseUpdatedAt === server.updatedAt) {
      return { sheet: { ...cached.sheet, updatedAt: server.updatedAt }, source: "recovered", unsynced: true };
    }
    return { sheet: server, source: "conflict", mine: cached.sheet };
  }

  writeSheetCache(id, { sheet: server, synced: true, baseUpdatedAt: server.updatedAt });
  return { sheet: server, source: "server" };
}
