// The Reduce Motion setting. "device" (the default) follows the phone's or
// computer's own Reduce Motion setting; "reduce" turns motion off here even
// when the device allows it. Saved on this device only.
//
// It works by putting data-motion="reduce" on <html>; index.css then switches
// off every animation and transition. Code that animates in JavaScript asks
// shouldReduceMotion() (or the useReducedMotion hook) first.

const STORAGE_KEY = "qk-motion";
const CHANGE_EVENT = "qk-motion-change";
const DEVICE_QUERY = "(prefers-reduced-motion: reduce)";

export const MOTION_OPTIONS = ["device", "reduce"];

export function getMotionPreference() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return MOTION_OPTIONS.includes(saved) ? saved : "device";
  } catch {
    return "device"; // storage blocked (private window): use the default
  }
}

// Puts the saved choice on <html>. Called once when the app starts.
export function applyMotionPreference(preference = getMotionPreference()) {
  if (preference === "reduce") document.documentElement.dataset.motion = "reduce";
  else delete document.documentElement.dataset.motion;
}

export function setMotionPreference(preference) {
  const value = MOTION_OPTIONS.includes(preference) ? preference : "device";
  try {
    if (value === "device") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Still applies for this visit even if it can't be saved.
  }
  applyMotionPreference(value);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// True when anything should skip its animation: the setting here, or the
// device's own Reduce Motion.
export function shouldReduceMotion() {
  return (
    document.documentElement.dataset.motion === "reduce" ||
    (window.matchMedia?.(DEVICE_QUERY).matches ?? false)
  );
}

// For useSyncExternalStore: calls onChange when either one changes.
export function subscribeToMotion(onChange) {
  const list = window.matchMedia?.(DEVICE_QUERY);
  list?.addEventListener?.("change", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    list?.removeEventListener?.("change", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
