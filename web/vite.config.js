var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
var ngrokHost = process.env.VITE_NGROK_HOST;
var hmrConfig = ngrokHost
    ? {
        hmr: {
            protocol: "wss",
            host: ngrokHost,
            clientPort: 443
        }
    }
    : {};
export default defineConfig({
    envDir: "..",
    plugins: [react()],
    server: __assign({ host: true, strictPort: true, port: 5173, allowedHosts: true }, hmrConfig)
});
