import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// BoardUI's source-owned files live at the project root while the app lives in
// src/, so the alias resolves the shared design-system folders first and falls
// back to src/ for app modules.
const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@\/components\/(base|application|foundations)\//, replacement: `${root}components/$1/` },
      { find: /^@\/styles\//, replacement: `${root}styles/` },
      { find: /^@\/utils\//, replacement: `${root}utils/` },
      { find: /^@\//, replacement: `${root}src/` },
    ],
  },
});
