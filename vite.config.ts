import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/hrv-card.ts",
      name: "HRVCard",
      formats: ["es"],
      fileName: () => "ha-hrv-card.js"
    },
    outDir: ".",
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
