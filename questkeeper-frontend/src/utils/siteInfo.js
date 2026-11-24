// Facts the legal pages and footer repeat. Kept in one place so a rename (or
// adding a contact email) is a one-line change.

export const SITE_NAME = "QuestKeeper";

// A contact email for privacy questions. Leave it empty until there is one;
// the privacy page then points people to the feedback link instead.
export const CONTACT_EMAIL = "";

export const FEEDBACK_URL = "https://github.com/samanthaparas/QuestKeeper/issues/new";

// Change this whenever the privacy page's wording changes.
export const PRIVACY_UPDATED = "November 25, 2026";

// True when the website was built with an error-reporting address (see
// utils/monitoring.js). The privacy page only names that service then.
export const ERROR_REPORTING_ON = Boolean(import.meta.env.VITE_SENTRY_DSN) && !import.meta.env.DEV;

// Change this whenever the terms page's wording changes.
export const TERMS_UPDATED = "November 23, 2026";
