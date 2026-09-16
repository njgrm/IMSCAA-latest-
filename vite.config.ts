import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'
import { networkInterfaces } from 'node:os'

// The QR scanner needs navigator.mediaDevices/getUserMedia, which browsers only
// expose in a secure context, and the app is opened from a phone on the LAN. So
// the dev server serves HTTPS using a locally trusted certificate that covers the
// current LAN address. mkcert keeps it valid and regenerates when the address
// changes. Every other device (e.g. a phone) still has to trust the mkcert root
// CA once, because it has its own trust store.
function devHosts() {
  const hosts = new Set(['localhost', '127.0.0.1', '::1'])
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) hosts.add(address.address)
    }
  }
  return [...hosts]
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), mkcert({ hosts: devHosts() })],
  server: {
    // Bind to every interface so the LAN address reaches the dev server.
    host: true,
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
            // Derive these from the connection itself, never from client-supplied
            // forwarding headers, which any caller could otherwise spoof.
            const host = String(req.headers.host || 'localhost')
            // `encrypted` is only present on TLS sockets, so it is read defensively.
            const isSecure = Boolean((req.socket as { encrypted?: boolean } | undefined)?.encrypted)
            const proto = isSecure || host.includes('devtunnels.ms') ? 'https' : 'http'
            proxyReq.setHeader('X-IMSCCA-Origin-Host', host)
            proxyReq.setHeader('X-IMSCCA-Origin-Proto', proto)
            proxyReq.setHeader('X-IMSCCA-Original-Origin', `${proto}://${host}`)
            // Overwritten (never appended) so the PHP side can trust the value.
            const clientIp = req.socket?.remoteAddress || ''
            if (clientIp) proxyReq.setHeader('X-Forwarded-For', clientIp)
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
