import { copyFileSync, existsSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

// The React application is the app. It is built into dist/ and deployed to
// Vercel from there; the files in ui/ are the shared design system and the
// browser helpers that the app and the tests share.
const here = path.dirname(fileURLToPath(import.meta.url));

// The specification and the other documents are linked from the pages, so
// they travel with the build.
function copyDocuments() {
  return {
    name: "copy-documents",
    closeBundle() {
      for (const name of ["SPECIFICATION.md", "ENGINE.md", "APPLICATION.md", "README.md"]) {
        const source = path.resolve(here, name);
        if (!existsSync(source)) continue;
        copyFileSync(source, path.resolve(here, "dist", name));
      }
    }
  };
}

export default defineConfig({
  root: "app",
  base: "/",
  plugins: [react(), copyDocuments()],
  resolve: {
    alias: {
      "@ui": path.resolve(here, "ui"),
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
