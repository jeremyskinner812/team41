import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // CLIENT_ORIGIN in .env (CORS + cookies) assumes this exact port.
    port: 5173,
    strictPort: true,
  },
})
