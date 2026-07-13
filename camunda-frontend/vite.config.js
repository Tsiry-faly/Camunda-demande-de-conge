import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/v2': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('--- Requête proxifiée ---')
            console.log('URL:', req.url)
            console.log('Header reçu par Vite:', req.headers['x-csrf-token'])
            if (req.headers['x-csrf-token']) {
              proxyReq.setHeader('X-CSRF-TOKEN', req.headers['x-csrf-token'])
            }
          })
        },
      },
    },
  },
})

