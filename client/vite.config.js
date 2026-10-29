// Vite config: React, the PWA plugin (installable app + offline shell) and a dev proxy.
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icon.svg", "icon-192.svg", "icon-512.svg"],
        manifest: {
          name: "Explore Arunachal",
          short_name: "Arunachal",
          description: "Permit-aware trip planning for Arunachal Pradesh",
          theme_color: "#13303A",
          background_color: "#EEF1F0",
          display: "standalone",
          start_url: "/",
          icons: [
            { src: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any maskable" },
            { src: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" }
          ]
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,woff2}"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ url, request }) =>
                request.method === "GET" &&
                (/^\/api\/trips(?:\/[^/]+)?$/.test(url.pathname) ||
                  /^\/api\/permits\/check$/.test(url.pathname) ||
                  /^\/api\/weather(?:\/|$)/.test(url.pathname)),
              handler: "NetworkFirst",
              options: {
                cacheName: "trip-pack",
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 250, maxAgeSeconds: 30 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [200] }
              }
            },
            {
              urlPattern: ({ url, request }) =>
                request.destination === "image" &&
                url.protocol === "https:" &&
                (url.hostname === "ik.imagekit.io" || url.hostname.endsWith(".imagekit.io")),
              handler: "CacheFirst",
              options: {
                cacheName: "saved-host-images",
                expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] }
              }
            }
          ]
        }
      })
    ],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "http://localhost:5000",
          changeOrigin: true
        }
      }
    }
  };
});
