import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    open: true,
    // share links (/share/job/..) are answered by the real server (preview page + redirect)
    proxy: { '/share': { target: 'https://ishkhwaz.zeraworld.com', changeOrigin: true } }
  }
})
