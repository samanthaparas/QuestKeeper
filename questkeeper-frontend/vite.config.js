import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Each build gets its own id (the Git commit on Render, or the time it was
// built), baked into the app and written to /version.json next to it. An
// open page checks /version.json now and then; when the id there differs
// from its own, a newer version is live and it offers a gentle "Refresh"
// (see UpdateBanner in App.jsx). In development there's no version.json, so
// nothing is offered.
const buildId = globalThis.process?.env?.RENDER_GIT_COMMIT || String(Date.now());

function buildVersionFile() {
  return {
    name: "questkeeper-build-version",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ buildId }) });
    },
  };
}

export default defineConfig({
  plugins: [react(), buildVersionFile()],
  define: {
    "import.meta.env.VITE_BUILD_ID": JSON.stringify(buildId),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
  },
});
