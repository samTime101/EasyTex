import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

// The React application is a host, exactly like the static pages in web/.
// It lives in app/ and reuses the engine in src/ and the shared styles in
// web/, so both hosts look and behave the same.
//
// The file is named vite.react.config.js on purpose: Vercel auto-detects a
// project called "vite.config.js" and would build the React app on every
// push. The static site stays the deployed one until the React build is
// ready to take over, and the scripts in package.json point here.
const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: "app",
  base: "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@web": path.resolve(here, "web"),
      "@engine": path.resolve(here, "src")
    }
  },
  server: {
    port: 5174,
    fs: { allow: [here] }
  },
  build: {
    outDir: path.resolve(here, "dist"),
    emptyOutDir: true,
    target: "es2022"
  }
});
