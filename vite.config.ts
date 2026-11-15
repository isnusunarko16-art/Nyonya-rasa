import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({ plugins: [react(), tailwindcss(), VitePWA({ registerType: 'autoUpdate',
  manifest: { name: 'UMKM Kita', short_name: 'UMKM', lang: 'id', display: 'standalone', start_url: '/', background_color: '#ffffff', theme_color: '#14b8a6',
    icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }] } })] })
