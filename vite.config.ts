import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/hrv-card.ts",
      name: "HRVCard",
      formats: ["es"],
      fileName: () => "hrv-card.js"
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
