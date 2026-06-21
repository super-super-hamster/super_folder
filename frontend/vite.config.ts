import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    {
      name: 'wails-thumb-fallback',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && (req.url.startsWith('/thumb') || req.url.startsWith('/file'))) {
            res.statusCode = 404
            res.end()
            return
          }
          next()
        })
      }
    }
  ]
})
