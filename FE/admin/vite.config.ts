import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

// SaigonDrain AI — admin app (http://localhost:5174)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT ?? 5174),
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_URL ?? "http://localhost:3000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            if ("writeHead" in res && !res.headersSent) {
              res.writeHead(502, { "Content-Type": "application/json" })
              res.end(
                JSON.stringify({
                  error: "Backend server offline",
                  code: "ECONNREFUSED",
                }),
              )
            }
          })
        },
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.PORT ?? 4174),
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_URL ?? "http://localhost:3000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            if ("writeHead" in res && !res.headersSent) {
              res.writeHead(502, { "Content-Type": "application/json" })
              res.end(
                JSON.stringify({
                  error: "Backend server offline",
                  code: "ECONNREFUSED",
                }),
              )
            }
          })
        },
      },
    },
  },
})
