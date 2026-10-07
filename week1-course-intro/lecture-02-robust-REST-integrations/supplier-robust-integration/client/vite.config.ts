import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Calls to /api are forwarded to the Express server, so we avoid CORS.
    proxy: { '/api': 'http://localhost:3000' },
  },
})
