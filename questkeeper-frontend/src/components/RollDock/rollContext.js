import { createContext, useContext } from "react";

// The character sheet's roller (from useSheetRolls), so any number on the
// sheet can become a roll button without passing it down by hand.
export const RollContext = createContext(null);

export function useRoller() {
  return useContext(RollContext);
}
