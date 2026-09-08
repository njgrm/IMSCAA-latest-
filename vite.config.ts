import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Dev Tunnels can reject Vite's HMR upgrade. Application Socket.IO remains proxied below.
    hmr: mode === 'tunnel' ? false : undefined,
    proxy: {
      '/my-app-server': {
        target: 'http://localhost',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost')
            const proto = String(req.headers['x-forwarded-proto'] || (host.includes('devtunnels.ms') ? 'https' : 'http'))
            proxyReq.setHeader('X-IMSCCA-Origin-Host', host)
            proxyReq.setHeader('X-IMSCCA-Origin-Proto', proto)
            proxyReq.setHeader('X-IMSCCA-Original-Origin', `${proto}://${host}`)
          })
        },
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
}))
