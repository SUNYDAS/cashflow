import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Without this Vite binds only to [::1], and browsers that resolve
    // "localhost" to 127.0.0.1 get a connection refused.
    host: '0.0.0.0',
    port: 5173,
    // Calls to /api reach the Splitr server, so the browser sees one origin.
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
})
