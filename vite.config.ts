import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages serves this from /<repo-name>/, so every asset URL needs that
// prefix. The workflow passes the repository's own name in VITE_BASE rather
// than hard-coding it here: rename the repo and the build follows, instead of
// deploying a page whose assets all 404.
/**
 * The dev server's HMR runs over a websocket that the built page never opens,
 * and index.html's connect-src does not list it - correctly, because shipping
 * "ws:" to production would widen the policy for something production does
 * not do. So the allowance is added to the served HTML in dev only, and the
 * file on disk stays the policy that ships.
 */
function cspAllowHmr() {
  return {
    name: "csp-allow-hmr",
    apply: "serve" as const,
    transformIndexHtml(html: string) {
      return html.replace(
        "connect-src 'self'",
        "connect-src 'self' ws://localhost:* http://localhost:*",
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  // loadEnv rather than process.env: it reads .env files too, so a local
  // build can set a base without exporting a shell variable, and it needs no
  // Node type definitions in a browser-targeted tsconfig.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    base: env.VITE_BASE || "/",
    plugins: [react(), tailwindcss(), cspAllowHmr()],
    build: { outDir: "dist", sourcemap: false },
  };
});
