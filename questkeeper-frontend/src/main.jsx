import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./context/AuthProvider";
import "./index.css";
import { applyMotionPreference } from "./utils/motionPreference";

// The Settings page's Reduce Motion choice, before anything draws.
applyMotionPreference();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
);
