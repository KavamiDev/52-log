import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages project site: https://kavamidev.github.io/52-log/
export default defineConfig({
  site: "https://kavamidev.github.io",
  base: "/52-log",
  vite: { plugins: [tailwindcss()] },
});
