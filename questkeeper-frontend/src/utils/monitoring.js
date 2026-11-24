// Error reports from real people's browsers, so a bug that only shows up on
// someone's phone doesn't go unnoticed.
//
//  - It does nothing unless a Sentry address is set (VITE_SENTRY_DSN on the
//    website's build in Render), and never while developing, so there's no
//    extra code loaded and nothing sent until it's switched on on purpose.
//  - It sends only what went wrong: the error, the page, the browser type and
//    which version of the site was running. No passwords, no notes, no
//    character data, no recordings of the screen, no usage tracking.
//  - Errors the app already handles in its own friendly way (a weak signal)
//    are left out, so the reports are the ones worth reading.
//
// The privacy page names this service only when it is switched on (see
// ERROR_REPORTING_ON in siteInfo.js).

const IGNORED = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
  "Failed to fetch",
  "Load failed",
  "NetworkError when attempting to fetch resource",
  "The operation was aborted",
];

let sentry = null;

// Starts error reports if they're switched on. Safe to call once at start-up;
// never throws.
export async function initMonitoring(env = import.meta.env) {
  const dsn = env.VITE_SENTRY_DSN;
  if (!dsn || env.DEV) return false;
  try {
    const loaded = await import("@sentry/react");
    loaded.init({
      dsn,
      environment: "production",
      release: env.VITE_BUILD_ID,
      // No personal details, no performance tracing, no screen recordings.
      sendDefaultPii: false,
      tracesSampleRate: 0,
      ignoreErrors: IGNORED,
      // The page address can hold a code (a table's join code, an invite).
      // Keep only the part before "?" and drop the hash's query too.
      beforeSend(event) {
        if (event.request?.url) event.request.url = event.request.url.replace(/[?#].*$/, "");
        if (event.request) delete event.request.cookies;
        return event;
      },
    });
    sentry = loaded;
    return true;
  } catch {
    return false;
  }
}

// Reports an error the app caught itself (the "Something went wrong" card).
// Does nothing when reporting is off.
export function reportError(error, componentStack = "") {
  try {
    sentry?.captureException(error, componentStack ? { contexts: { react: { componentStack } } } : undefined);
  } catch {
    // Reporting must never be the thing that breaks.
  }
}

// For tests: forget the loaded library.
export function resetMonitoring() {
  sentry = null;
}
