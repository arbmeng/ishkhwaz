import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const BUILD_ID = String(Date.now())
// version.json lets the running app notice that a newer build has been deployed
const versionFile = () => ({ name: 'version-file', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ v: BUILD_ID }) }) } })

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [react(), tailwindcss(), versionFile()],
  server: {
    port: 3000,
    open: true,
    // share links (/share/job/..) are answered by the real server (preview page + redirect)
    proxy: { '/share': { target: 'https://ishkhwaz.zeraworld.com', changeOrigin: true } }
  }
})
