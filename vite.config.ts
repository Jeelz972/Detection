import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Permet de faire des imports comme : import { DataManager } from '@/lib/dataManager'
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    open: true, // Ouvre automatiquement le navigateur au lancement
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
