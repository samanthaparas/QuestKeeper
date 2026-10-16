import { useSyncExternalStore } from "react";
import { shouldReduceMotion, subscribeToMotion } from "../utils/motionPreference";

// True while motion should be skipped: the Settings page's Reduce Motion
// switch, or the device's own setting. Updates live when either changes.
export function useReducedMotion() {
  return useSyncExternalStore(subscribeToMotion, shouldReduceMotion);
}
