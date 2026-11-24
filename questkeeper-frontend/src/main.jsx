import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";

import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import { AuthProvider } from "./context/AuthProvider";
import "./index.css";
import { applyMotionPreference } from "./utils/motionPreference";
import { applyThemePreference } from "./utils/themePreference";
import { applyDisplayPreferences } from "./utils/displayPreference";
import { initMonitoring } from "./utils/monitoring";

// The Settings page's Reduce Motion choice, before anything draws.
applyMotionPreference();
// And the Appearance choice (light, dark or follow the device).
applyThemePreference();
// And Text size and High contrast.
applyDisplayPreferences();
// Error reports from real browsers, if switched on (see utils/monitoring.js).
initMonitoring();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
