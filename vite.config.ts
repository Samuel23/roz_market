import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages serves this from /<repo-name>/, so every asset URL needs that
// prefix. The workflow passes the repository's own name in VITE_BASE rather
// than hard-coding it here: rename the repo and the build follows, instead of
// deploying a page whose assets all 404.
export default defineConfig(({ mode }) => {
  // loadEnv rather than process.env: it reads .env files too, so a local
  // build can set a base without exporting a shell variable, and it needs no
  // Node type definitions in a browser-targeted tsconfig.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    base: env.VITE_BASE || "/",
    plugins: [react(), tailwindcss()],
    build: { outDir: "dist", sourcemap: false },
  };
});
