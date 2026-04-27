import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const ngrokHost = process.env.VITE_NGROK_HOST;

const hmrConfig = ngrokHost
  ? {
      hmr: {
        protocol: "wss" as const,
        host: ngrokHost,
        clientPort: 443
      }
    }
  : {};

export default defineConfig({
  envDir: "..",
  plugins: [react()],
  server: {
    host: true,
    strictPort: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    },
    ...hmrConfig
  }
});
