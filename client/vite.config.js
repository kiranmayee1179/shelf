import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vercel defines the VERCEL environment variable as '1' during builds.
// We use '/' for Vercel (root level) and '/shelf/' for GitHub Pages.
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

// https://vite.dev/config/
export default defineConfig({
  base: isVercel ? '/' : '/shelf/',
  plugins: [react()],
  server: {
    port: 3000
  }
})
