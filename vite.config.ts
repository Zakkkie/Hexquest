// Fix: Use vitest/config instead of triple-slash reference to avoid type definition errors
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  mode: 'production',
  plugins: [react()],
  base: './', // CRITICAL: Allows assets to load via file:// protocol in Electron
  server: {
    host: true,
    port: 3000
  },
  test: {
    globals: true,
    environment: 'node', // Using 'node' for fast logic testing in engine/
  }
})