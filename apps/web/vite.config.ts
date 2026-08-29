import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { defineConfig, type Plugin } from "vite";

const offlineAssetManifest: Plugin = {
  name: "offline-asset-manifest",
  generateBundle(_options, bundle) {
    const assets = [
      "/",
      "/manifest.webmanifest",
      "/favicon-32.png",
      "/apple-touch-icon.png",
      "/wingedhorse-icon-192.png",
      "/wingedhorse-icon-512.png"
    ];
    for (const [fileName, output] of Object.entries(bundle)) {
      if (output.type === "chunk" && output.code.length > 500_000) continue;
      assets.push(`/${fileName}`);
    }
    const uniqueAssets = [...new Set(assets)].sort();
    this.emitFile({
      type: "asset",
      fileName: "asset-manifest.json",
      source: JSON.stringify({
        version: createHash("sha256").update(uniqueAssets.join("\n")).digest("hex").slice(0, 12),
        assets: uniqueAssets
      })
    });
  }
};

export default defineConfig({
  plugins: [react(), offlineAssetManifest],
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: { "/api": { target: "http://localhost:3100", changeOrigin: true } }
  },
  preview: { port: 4173, host: "0.0.0.0" }
});
