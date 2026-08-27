import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: { "/api": { target: "http://localhost:3100", changeOrigin: true } }
  },
  preview: { port: 4173, host: "0.0.0.0" }
});
