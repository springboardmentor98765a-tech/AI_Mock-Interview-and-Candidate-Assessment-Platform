import { defineConfig } from "vite";

// SmartHire AI is a multi-page static site (no framework).
// We list every HTML page as a build entry point so Vite outputs
// all four pages into dist/ instead of only index.html.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index:      "index.html",
        candidate:  "candidate.html",
        recruiter:  "recruiter.html",
        admin:      "admin.html"
      }
    }
  }
});
