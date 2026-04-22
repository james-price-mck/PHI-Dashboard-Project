import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// For GitHub Pages project sites: set VITE_BASE=/repo-name/ in CI (see workflow).
const base = process.env.VITE_BASE ?? process.env.BASE_URL ?? "/";

export default defineConfig({
  plugins: [react()],
  base,
});
